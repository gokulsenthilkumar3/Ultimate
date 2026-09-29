package com.growthtrack.health

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.health.connect.client.HealthConnectClient
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.time.Instant

class CompanionModel(application: Application) : AndroidViewModel(application) {
    private val storage = SecureStore(application)
    val reader = HealthReader(application)
    var state by mutableStateOf(SecureStore.emptyState())
        private set
    var grants by mutableStateOf(emptySet<String>())
        private set
    var permissionRequested by mutableStateOf(emptySet<Metric>())
        private set
    var busy by mutableStateOf(false)
        private set
    var message by mutableStateOf("Choose only the metrics you want to share.")
        private set
    private var storageReady = false
    init {
        try { state = storage.load(); storageReady = true }
        catch (_: Exception) { message = "Secure storage could not be opened. Unlock the device and reopen the app." }
    }
    fun selected(metric: Metric) = state.getJSONObject("selected").optBoolean(metric.wire)
    val paired get() = state.has("credentials")
    val disconnectPending get() = state.optBoolean("disconnectPending")
    fun permissions(): JSONObject = JSONObject().apply {
        for (metric in Metric.entries) {
            val access = when {
                !selected(metric) -> "not_requested"
                reader.availability != HealthConnectClient.SDK_AVAILABLE -> "unavailable"
                reader.permission(metric) in grants -> "granted"
                metric in permissionRequested -> "denied"
                else -> "not_requested"
            }
            put(metric.wire, JSONObject().put("optedIn", selected(metric)).put("access", access))
        }
    }
    private fun persist(next: JSONObject) {
        if (!storageReady) throw CompanionFailure("Secure storage is unavailable.")
        storage.save(next); state = next
    }
    private fun copyState() = JSONObject(state.toString())
    private fun run(operation: suspend () -> Unit) {
        if (busy) return
        busy = true
        viewModelScope.launch {
            try {
                if (!storageReady) throw CompanionFailure("Secure storage is unavailable.")
                operation()
            } catch (error: CancellationException) { throw error }
            catch (error: CompanionFailure) { message = error.safeMessage }
            catch (error: HttpFailure) {
                message = when (error.status) {
                    401, 410 -> "Connection revoked or credential expired. Pair again in GrowthTrack."
                    404, 501 -> "The health companion service is not configured on this server."
                    else -> "Server request failed (HTTP ${error.status}); sync has not completed."
                }
            } catch (_: SecurityException) {
                message = "Health permission was denied or revoked. No successful sync is claimed."
                grants = emptySet()
            } catch (_: Exception) { message = "Health access, network, or secure persistence failed. Sync has not completed." }
            finally { busy = false }
        }
    }
    fun setOptIn(metric: Metric, enabled: Boolean) = run {
        val next = copyState()
        next.getJSONObject("selected").put(metric.wire, enabled)
        next.getJSONObject("cursors").remove(metric.wire)
        persist(next)
        grants = reader.granted()
        message = if (enabled) "Opt-in saved. Request Health Connect access to this metric."
            else "Metric disabled locally. Previously imported server records remain."
        if (paired && !disconnectPending) HealthApi(state.getString("endpoint")).connection(state.getJSONObject("credentials"), permissions())
    }
    fun pair(endpoint: String, code: String) = run {
        Wire.requireSafe(!paired)
        val api = HealthApi(endpoint)
        val credentials = api.pair(code.trim().uppercase(java.util.Locale.ROOT))
        val next = copyState().put("endpoint", endpoint).put("credentials", credentials).put("disconnectPending", false)
        for (field in listOf("cursors", "lastRead", "lastAck", "newestSample")) next.put(field, JSONObject())
        persist(next)
        grants = reader.granted()
        message = "Paired. No health samples have been sent."
        api.connection(credentials, permissions())
    }
    fun requested(metrics: Set<Metric>): Boolean {
        if (busy || !storageReady) return false
        return try {
            val requested = permissionRequested + metrics
            persist(copyState().put("permissionRequested", org.json.JSONArray(requested.map { it.name })))
            permissionRequested = requested
            true
        } catch (_: Exception) { message = "Could not securely save the permission request."; false }
    }
    fun refreshAccess() = run {
        val previous = grants
        grants = reader.granted()
        // Persist the fact that a request has occurred, so a missing grant after restart remains truthful.
        permissionRequested = permissionRequested + Metric.entries.filter { reader.permission(it) in previous || reader.permission(it) in grants }
        if (state.has("permissionRequested")) {
            val recorded = state.getJSONArray("permissionRequested")
            permissionRequested = permissionRequested + (0 until recorded.length()).map { Metric.valueOf(recorded.getString(it)) }
        }
        val next = copyState().put("permissionRequested", org.json.JSONArray(permissionRequested.map { it.name }))
        for (metric in Metric.entries) if (reader.permission(metric) !in grants) next.getJSONObject("cursors").remove(metric.wire)
        persist(next)
        if (paired && !disconnectPending) {
            HealthApi(state.getString("endpoint")).connection(state.getJSONObject("credentials"), permissions())
            message = "Backend connection checked. Health Connect permissions refreshed."
        }
    }
    fun sync() = run {
        Wire.requireSafe(paired && !disconnectPending)
        val credentials = state.getJSONObject("credentials")
        Wire.credentials(credentials)
        val api = HealthApi(state.getString("endpoint"))
        grants = reader.granted()
        api.connection(credentials, permissions())
        var imported = 0
        for (metric in Metric.entries.filter { selected(it) }) {
            if (!SyncPolicy.canRead(selected(metric), reader.permission(metric) in grants, disconnectPending)) {
                message = "${metric.wire}: read access not granted. No samples were fabricated."
                continue
            }
            var cursor = state.getJSONObject("cursors").optJSONObject(metric.wire)
            if (SyncPolicy.shouldRotate(cursor?.let { Wire.instant(it.getString("createdAt")) }, Instant.now()))
                cursor = reader.newCursor(metric)
            var current = cursor ?: throw CompanionFailure("Missing sync cursor.")
            val bootstrap = copyState()
            bootstrap.getJSONObject("cursors").put(metric.wire, current)
            persist(bootstrap)
            var complete = false
            for (pageNumber in 0 until SyncPolicy.MAX_PAGES) {
                val page = try { reader.read(metric, current) } catch (error: CompanionFailure) {
                    // A rejected/expired token requires bounded rebootstrap, never a full-history read.
                    val failed = copyState(); failed.getJSONObject("cursors").remove(metric.wire); persist(failed)
                    throw error
                }
                var ack: String? = null
                // Coalesce multiple upserts of one ID to the last provider change in this page.
                val additions = page.samples.associateBy { it.getJSONObject("source").getString("externalId") }.values.toList()
                val removals = page.deletions.distinctBy { it.getJSONObject("source").getString("externalId") }
                for (part in additions.chunked(200)) {
                    ack = api.upload(Wire.batch(credentials.getString("connectionId"), metric,
                        Wire.instant(current.getString("windowStart")), page.end, part, emptyList()), credentials)
                }
                for (part in removals.chunked(200)) {
                    ack = api.upload(Wire.batch(credentials.getString("connectionId"), metric,
                        Wire.instant(current.getString("windowStart")), page.end, emptyList(), part), credentials)
                }
                if (ack == null) ack = api.upload(Wire.batch(credentials.getString("connectionId"), metric,
                    Wire.instant(current.getString("windowStart")), page.end, emptyList(), emptyList()), credentials)
                val next = copyState()
                next.getJSONObject("cursors").put(metric.wire, page.nextCursor)
                next.getJSONObject("lastRead").put(metric.wire, Instant.now().toString())
                next.getJSONObject("lastAck").put(metric.wire, ack)
                val newest = additions.map { Wire.instant(it.getString("endAt")) }.maxOrNull()
                if (newest != null) {
                    val previous = next.getJSONObject("newestSample").optString(metric.wire)
                    if (previous.isEmpty() || newest > Wire.instant(previous)) next.getJSONObject("newestSample").put(metric.wire, newest.toString())
                }
                persist(next) // Only after ALL chunks are acknowledged.
                current = page.nextCursor
                imported += additions.size
                if (page.complete) { complete = true; break }
            }
            if (!complete) throw CompanionFailure("Foreground page limit reached; sync again to continue.")
        }
        message = if (imported > 0) "Foreground sync completed; $imported source records acknowledged (replays may be duplicates)."
            else "No new accessible records. Check each metric's access state; no empty-data zero was created."
    }
    fun disconnect() = run {
        val next = copyState().put("disconnectPending", true).put("selected", JSONObject()).put("cursors", JSONObject())
        for (field in listOf("lastRead", "lastAck", "newestSample")) next.put(field, JSONObject())
        persist(next) // Stop reads locally before any network call.
        if (paired) HealthApi(state.getString("endpoint")).disconnect(state.getJSONObject("credentials"))
        persist(SecureStore.emptyState())
        message = "Disconnected; credentials erased. Remove Health Connect access or imported server records separately."
    }
    fun forgetLocal() = run {
        Wire.requireSafe(disconnectPending)
        persist(SecureStore.emptyState())
        message = "Local credentials erased. Server revocation was not confirmed; revoke this device in GrowthTrack."
    }
}
