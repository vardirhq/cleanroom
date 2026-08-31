package no.vardir.cleanroom.spike

import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    SpikeScreen(
                        openDeveloperSettings = {
                            startActivity(Intent(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS))
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun SpikeScreen(openDeveloperSettings: () -> Unit) {
    val context = LocalContext.current.applicationContext
    val scope = rememberCoroutineScope()
    var pairingPort by remember { mutableStateOf("") }
    var pairingCode by remember { mutableStateOf("") }
    var status by remember { mutableStateOf("Not connected") }
    var results by remember { mutableStateOf(emptyList<ProbeResult>()) }
    var busy by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Cleanroom Local ADB Spike", style = MaterialTheme.typography.headlineSmall)
        Text(
            "This is deliberately not Cleanroom yet. Its only job is to prove that a phone can pair with its own Wireless Debugging service and run the ADB calls Cleanroom depends on."
        )

        Button(onClick = openDeveloperSettings, enabled = !busy) {
            Text("Open Developer Options")
        }

        Text(
            "In Wireless debugging, choose ‘Pair device with pairing code’. Keep Settings visible (split screen is safest), then enter the pairing port and six-digit code below."
        )

        OutlinedTextField(
            value = pairingPort,
            onValueChange = { pairingPort = it.filter(Char::isDigit) },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Pairing port") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            singleLine = true
        )
        OutlinedTextField(
            value = pairingCode,
            onValueChange = { pairingCode = it.filter(Char::isDigit).take(6) },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Pairing code") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
            singleLine = true
        )

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(
                enabled = !busy && pairingPort.isNotBlank() && pairingCode.length == 6,
                onClick = {
                    scope.launch {
                        busy = true
                        status = "Pairing…"
                        results = emptyList()
                        status = runCatching {
                            withContext(Dispatchers.IO) {
                                val probe = LocalAdbProbe(context)
                                val paired = probe.pair(pairingPort.toInt(), pairingCode)
                                if (!paired) error("Pairing returned false")
                                val connected = probe.connect()
                                if (!connected && !probe.isConnected()) error("Pairing succeeded, connection did not")
                            }
                            "Paired and connected"
                        }.getOrElse { "Pair failed: ${it.message ?: it.javaClass.simpleName}" }
                        busy = false
                    }
                }
            ) { Text("Pair + connect") }

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
        }

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
                            if (!probe.isConnected() && !probe.connect() && !probe.isConnected()) {
                                error("ADB is not connected")
                            }
                            probe.runCleanroomChecks()
                        }
                    }
                    results = outcome.getOrElse {
                        listOf(ProbeResult("Probe startup", false, it.message ?: it.javaClass.simpleName))
                    }
                    status = if (results.all { it.success }) "All probes passed" else "One or more probes failed"
                    busy = false
                }
            }
        ) {
            Text("Run Cleanroom probes")
        }

        results.forEach { result -> ProbeCard(result) }

        Spacer(Modifier.height(20.dp))
        Text(
            "Success criteria: pair without a PC, reconnect after killing the app, list packages, resolve HOME, read notification diagnostics, and confirm shell identity. Reboot persistence is a manual test because Android insists on making the interesting part involve an actual device.",
            style = MaterialTheme.typography.bodySmall
        )
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
