package no.vardir.cleanroom.spike

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import io.github.muntashirakon.adb.AdbStream
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

class LocalAdbProbe(context: Context) {
    private val appContext = context.applicationContext
    private val manager = AdbConnectionManager(appContext)

    fun pair(pairingPort: Int, pairingCode: String): Boolean =
        manager.pair("127.0.0.1", pairingPort, pairingCode)

    fun discoverPairingPort(timeoutMillis: Long = 10_000): Int? {
        val nsd = appContext.getSystemService(NsdManager::class.java)
        val latch = CountDownLatch(1)
        val port = AtomicInteger(-1)

        lateinit var listener: NsdManager.DiscoveryListener
        listener = object : NsdManager.DiscoveryListener {
            override fun onDiscoveryStarted(serviceType: String) = Unit
            override fun onDiscoveryStopped(serviceType: String) = Unit
            override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) = latch.countDown()
            override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) = Unit

            override fun onServiceFound(serviceInfo: NsdServiceInfo) {
                nsd.resolveService(serviceInfo, object : NsdManager.ResolveListener {
                    override fun onResolveFailed(serviceInfo: NsdServiceInfo, errorCode: Int) = Unit
                    override fun onServiceResolved(serviceInfo: NsdServiceInfo) {
                        if (serviceInfo.port > 0 && port.compareAndSet(-1, serviceInfo.port)) latch.countDown()
                    }
                })
            }

            override fun onServiceLost(serviceInfo: NsdServiceInfo) = Unit
        }

        nsd.discoverServices("_adb-tls-pairing._tcp.", NsdManager.PROTOCOL_DNS_SD, listener)
        return try {
            latch.await(timeoutMillis, TimeUnit.MILLISECONDS)
            port.get().takeIf { it > 0 }
        } finally {
            runCatching { nsd.stopServiceDiscovery(listener) }
        }
    }

    fun connect(timeoutMillis: Long = 10_000): Boolean {
        if (manager.isConnected) return true
        return manager.autoConnect(appContext, timeoutMillis)
    }

    fun isConnected(): Boolean = manager.isConnected

    fun run(command: String): String {
        check(manager.isConnected) { "ADB is not connected" }
        val stream: AdbStream = manager.openStream("shell:$command")
        stream.use {
            return it.openInputStream().bufferedReader().use { reader -> reader.readText() }.trim()
        }
    }

    fun runCleanroomChecks(): List<ProbeResult> = listOf(
        probe("Shell identity", "id"),
        probe("Package inventory", "pm list packages -3"),
        probe(
            "Home resolver",
            "cmd package resolve-activity --brief -a android.intent.action.MAIN -c android.intent.category.HOME"
        ),
        probe("Notification service", "dumpsys notification")
    )

    private fun probe(name: String, command: String): ProbeResult = try {
        ProbeResult(name, true, run(command).lineSequence().take(40).joinToString("\n"))
    } catch (error: Throwable) {
        ProbeResult(name, false, error.message ?: error.javaClass.simpleName)
    }
}

data class ProbeResult(
    val name: String,
    val success: Boolean,
    val output: String
)
