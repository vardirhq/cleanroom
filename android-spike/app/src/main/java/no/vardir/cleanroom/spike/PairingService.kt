package no.vardir.cleanroom.spike

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.RemoteInput
import android.app.Service
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import java.util.concurrent.Executors

class PairingService : Service() {
    private val executor = Executors.newSingleThreadExecutor()

    override fun onCreate() {
        super.onCreate()
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL, "Cleanroom pairing", NotificationManager.IMPORTANCE_HIGH)
        )
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_PAIR -> handlePair(intent)
            else -> showWaitingNotification()
        }
        return START_NOT_STICKY
    }

    private fun showWaitingNotification() {
        val input = RemoteInput.Builder(KEY_CODE)
            .setLabel("6-digit pairing code")
            .build()
        val pairIntent = Intent(this, PairingService::class.java).setAction(ACTION_PAIR)
        val pending = PendingIntent.getService(
            this, 1, pairIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        )
        val action = NotificationCompat.Action.Builder(0, "Enter pairing code", pending)
            .addRemoteInput(input)
            .build()

        startForeground(
            NOTIFICATION_ID,
            NotificationCompat.Builder(this, CHANNEL)
                .setSmallIcon(android.R.drawable.stat_sys_data_bluetooth)
                .setContentTitle("Cleanroom advanced access")
                .setContentText("In Wireless debugging, tap Pair device with pairing code, then enter the code here.")
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .addAction(action)
                .build()
        )
    }

    private fun handlePair(intent: Intent) {
        val code = RemoteInput.getResultsFromIntent(intent)?.getCharSequence(KEY_CODE)?.toString()?.trim()
        if (code?.length != 6 || code.any { !it.isDigit() }) {
            showResult("Pairing code must be six digits", false)
            return
        }

        showProgress("Finding Android pairing service…")
        executor.execute {
            val result = runCatching {
                val probe = LocalAdbProbe(applicationContext)
                val port = probe.discoverPairingPort()
                    ?: error("Pairing service was not discovered. Keep the pairing-code dialog open and try again.")
                if (!probe.pair(port, code)) error("Android rejected the pairing code")
                if (!probe.connect() && !probe.isConnected()) error("Paired, but could not connect")
            }
            if (result.isSuccess) showResult("Advanced access connected", true)
            else showResult(result.exceptionOrNull()?.message ?: "Pairing failed", false)
        }
    }

    private fun showProgress(message: String) {
        NotificationManagerCompat.from(this).notify(
            NOTIFICATION_ID,
            NotificationCompat.Builder(this, CHANNEL)
                .setSmallIcon(android.R.drawable.stat_sys_data_bluetooth)
                .setContentTitle("Cleanroom advanced access")
                .setContentText(message)
                .setOngoing(true)
                .build()
        )
    }

    private fun showResult(message: String, success: Boolean) {
        val open = PendingIntent.getActivity(
            this, 2, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        NotificationManagerCompat.from(this).notify(
            NOTIFICATION_ID,
            NotificationCompat.Builder(this, CHANNEL)
                .setSmallIcon(if (success) android.R.drawable.stat_sys_download_done else android.R.drawable.stat_notify_error)
                .setContentTitle(if (success) "Cleanroom is connected" else "Cleanroom pairing failed")
                .setContentText(message)
                .setContentIntent(open)
                .setAutoCancel(true)
                .build()
        )
        stopForeground(false)
        stopSelf()
    }

    override fun onDestroy() {
        executor.shutdownNow()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        private const val CHANNEL = "cleanroom_pairing"
        private const val NOTIFICATION_ID = 41
        private const val ACTION_PAIR = "no.vardir.cleanroom.spike.PAIR"
        private const val KEY_CODE = "pairing_code"
    }
}
