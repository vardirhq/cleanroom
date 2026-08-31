package no.vardir.cleanroom.spike

import android.content.Context
import io.github.muntashirakon.adb.AdbStream

class LocalAdbProbe(context: Context) {
    private val appContext = context.applicationContext
    private val manager = AdbConnectionManager(appContext)

    fun pair(pairingPort: Int, pairingCode: String): Boolean =
        manager.pair("127.0.0.1", pairingPort, pairingCode)

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
        probe("Package inventory", "pm list packages -3 | head -n 20"),
        probe(
            "Home resolver",
            "cmd package resolve-activity --brief android.intent.action.MAIN android.intent.category.HOME"
        ),
        probe("Notification service", "dumpsys notification | head -n 40"),
        probe("Shell identity", "id")
    )

    private fun probe(name: String, command: String): ProbeResult = try {
        ProbeResult(name, true, run(command))
    } catch (error: Throwable) {
        ProbeResult(name, false, error.message ?: error.javaClass.simpleName)
    }
}

data class ProbeResult(
    val name: String,
    val success: Boolean,
    val output: String
)
