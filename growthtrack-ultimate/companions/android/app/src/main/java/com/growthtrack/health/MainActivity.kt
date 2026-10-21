package com.growthtrack.health

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.lifecycle.viewmodel.compose.viewModel

class MainActivity : ComponentActivity() {
    private var activeModel: CompanionModel? = null
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val model: CompanionModel = viewModel()
            activeModel = model
            MaterialTheme { CompanionScreen(model, ::openSystemPage) }
        }
    }
    override fun onResume() { super.onResume(); activeModel?.refreshAccess() }
    private fun openSystemPage(uri: String) {
        // ACTION_VIEW is a system browser/store flow; there is no WebView or embedded login.
        try { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(uri))) }
        catch (_: Exception) { /* The screen still truthfully shows unavailable; no simulated success. */ }
    }
}

@Composable
private fun CompanionScreen(model: CompanionModel, openSystemPage: (String) -> Unit) {
    var endpoint by remember { mutableStateOf(model.state.optString("endpoint")) }
    var code by remember { mutableStateOf("") }
    val launcher = rememberLauncherForActivityResult(PermissionController.createRequestPermissionResultContract()) {
        model.refreshAccess()
    }
    LaunchedEffect(Unit) { model.refreshAccess() }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),
           verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("GrowthTrack Health", style = MaterialTheme.typography.headlineMedium)
        Text("Create a Health Connect pairing code in your signed-in GrowthTrack web app. Verify your server origin. Codes expire after two minutes.")
        OutlinedTextField(endpoint, { endpoint = it }, label = { Text("HTTPS server origin") }, enabled = !model.busy && !model.paired,
            modifier = Modifier.fillMaxWidth(), singleLine = true)
        OutlinedTextField(code, { code = it }, label = { Text("Single-use code") }, visualTransformation = PasswordVisualTransformation(),
            enabled = !model.busy && !model.paired, modifier = Modifier.fillMaxWidth(), singleLine = true)
        Button(onClick = { model.pair(endpoint, code); code = "" }, enabled = !model.busy && !model.paired) {
            Text(if (model.paired) "Device paired" else "Pair device")
        }
        Text("Share only what you choose", style = MaterialTheme.typography.titleMedium)
        for (metric in Metric.entries) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column {
                    Text(metric.wire.replaceFirstChar { it.uppercase() })
                    Text(model.permissions().getJSONObject(metric.wire).getString("access"), style = MaterialTheme.typography.bodySmall)
                }
                Switch(checked = model.selected(metric), onCheckedChange = { model.setOptIn(metric, it) },
                    enabled = !model.busy && !model.disconnectPending)
            }
        }
        Button(onClick = {
            val selected = Metric.entries.filter { model.selected(it) }.toSet()
            if (model.requested(selected)) launcher.launch(selected.map { model.reader.permission(it) }.toSet())
        }, enabled = !model.busy && !model.disconnectPending && Metric.entries.any { model.selected(it) } &&
            model.reader.availability == HealthConnectClient.SDK_AVAILABLE) { Text("Request selected read permissions") }
        if (model.reader.availability != HealthConnectClient.SDK_AVAILABLE) {
            Text("Health Connect is unavailable or requires installation/update; no health samples can be read.")
            TextButton(onClick = { openSystemPage("https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata") }) {
                Text("Open Health Connect in system browser/store")
            }
        }
        Text("Manage or revoke permissions in Android Settings → Health Connect → App permissions. This app only reads health data.")
        Text("Recent seven days, bounded foreground sync, no local health history. Sleep sessions are not assumed to be time asleep.")
        Button(onClick = model::sync, enabled = !model.busy && model.paired && !model.disconnectPending) { Text("Sync now") }
        for (metric in Metric.entries) {
            Text("${metric.wire}:\nLast read: ${model.state.getJSONObject("lastRead").optString(metric.wire, "Never")}\n" +
                "Last server acknowledgement: ${model.state.getJSONObject("lastAck").optString(metric.wire, "Never")}\n" +
                "Newest observed sample: ${model.state.getJSONObject("newestSample").optString(metric.wire, "None observed")}",
                style = MaterialTheme.typography.bodySmall)
        }
        Text(model.message)
        if (model.busy) CircularProgressIndicator()
        OutlinedButton(onClick = model::disconnect, enabled = !model.busy && model.paired) {
            Text(if (model.disconnectPending) "Retry server revocation" else "Disconnect device")
        }
        if (model.disconnectPending) {
            Text("Reads and uploads are stopped locally. Server revocation is pending. If you forget locally, revoke this device in GrowthTrack.")
            TextButton(onClick = model::forgetLocal, enabled = !model.busy) { Text("Forget this device locally") }
        }
    }
}

class PermissionsRationaleActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { MaterialTheme {
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Text("GrowthTrack health data use", style = MaterialTheme.typography.headlineSmall)
                Text("Weight, steps, sleep sessions, and exercise sessions are read only after you opt in for each metric and grant Android permission. They are sent over HTTPS to the GrowthTrack server you pair with, to show your personal health records and trends. Manual entries must be preserved.")
                Text("This device retains encrypted credentials, opt-ins, cursors and freshness timestamps, not health history. No advertising or analytics SDK is included. Disconnect stops local sync and asks the paired server to revoke credentials; permission revocation and deletion of previously imported server records are separate actions.")
                Text("Before distribution, the operator must publish this policy with their identity, contact and server retention/deletion terms, matching the policy declared in Google Play.")
            }
        } }
    }
}
