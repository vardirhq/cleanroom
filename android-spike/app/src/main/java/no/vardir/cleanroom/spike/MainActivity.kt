package no.vardir.cleanroom.spike

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {
    private val notificationPermission = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted || Build.VERSION.SDK_INT < 33) beginPairingSetup()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    SpikeScreen(
                        enableAdvancedAccess = { requestPairingSetup() },
                        openWirelessDebugging = { openWirelessDebugging() }
                    )
                }
            }
        }
    }

    private fun requestPairingSetup() {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        } else beginPairingSetup()
    }

    private fun beginPairingSetup() {
        ContextCompat.startForegroundService(this, Intent(this, PairingService::class.java))
        openWirelessDebugging()
    }

    private fun openWirelessDebugging() {
        val direct = Intent("android.settings.WIRELESS_DEBUGGING_SETTINGS")
        val fallback = Intent(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS)
        startActivity(if (direct.resolveActivity(packageManager) != null) direct else fallback)
    }
}

@Composable
private fun SpikeScreen(enableAdvancedAccess: () -> Unit, openWirelessDebugging: () -> Unit) {
    val context = LocalContext.current.applicationContext
    val scope = rememberCoroutineScope()
    var status by remember { mutableStateOf("Not connected") }
    var results by remember { mutableStateOf(emptyList<ProbeResult>()) }
    var busy by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Text("Cleanroom Local ADB Spike", style = MaterialTheme.typography.headlineSmall)
        Text("Test the setup we would actually ship: no PC, no helper app, no split screen, and no pairing-port entry.")

        Card(modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Advanced access", style = MaterialTheme.typography.titleMedium)
                Text("1. Tap Enable advanced access.\n2. Turn on Wireless debugging.\n3. Tap Pair device with pairing code.\n4. Pull down notifications and enter the six-digit code in Cleanroom.\n5. Return here when Cleanroom says it is connected.")
                Button(onClick = enableAdvancedAccess, enabled = !busy) { Text("Enable advanced access") }
                Button(onClick = openWirelessDebugging, enabled = !busy) { Text("Open Wireless debugging") }
            }
        }

        Button(
            enabled = !busy,
            onClick = {
                scope.launch {
                    busy = true
                    status = "Connecting…"
                    status = runCatching {
                        withContext(Dispatchers.IO) {
                            val probe = LocalAdbProbe(context)
                            if (!probe.connect() && !probe.isConnected()) error("No paired ADB service discovered")
                        }
                        "Connected using saved identity"
                    }.getOrElse { "Reconnect failed: ${it.message ?: it.javaClass.simpleName}" }
                    busy = false
                }
            }
        ) { Text("Reconnect") }

        Text("Status: $status")

        Button(
            enabled = !busy,
            onClick = {
                scope.launch {
                    busy = true
                    status = "Running Cleanroom probes…"
                    val outcome = runCatching {
                        withContext(Dispatchers.IO) {
                            val probe = LocalAdbProbe(context)
                            if (!probe.isConnected() && !probe.connect() && !probe.isConnected()) error("ADB is not connected")
                            probe.runCleanroomChecks()
                        }
                    }
                    results = outcome.getOrElse { listOf(ProbeResult("Probe startup", false, it.message ?: it.javaClass.simpleName)) }
                    status = if (results.all { it.success }) "All probes passed" else "One or more probes failed"
                    busy = false
                }
            }
        ) { Text("Run Cleanroom probes") }

        results.forEach { result -> ProbeCard(result) }
    }
}

@Composable
private fun ProbeCard(result: ProbeResult) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(if (result.success) "✓ ${result.name}" else "✗ ${result.name}")
            Text(result.output.ifBlank { "(no output)" }, fontFamily = FontFamily.Monospace)
        }
    }
}
