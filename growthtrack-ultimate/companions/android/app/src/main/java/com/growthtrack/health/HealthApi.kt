package com.growthtrack.health

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.net.URI
import javax.net.ssl.HttpsURLConnection
import kotlin.random.Random

class HealthApi(endpoint: String) {
    private val origin: URI = Wire.origin(endpoint)
    private suspend fun request(method: String, path: String, body: JSONObject? = null,
                                token: String? = null, retry: Boolean = false): JSONObject? {
        // Serialize once, so retries keep the exact same batchId and bytes.
        val bytes = body?.toString()?.toByteArray(Charsets.UTF_8)
        val attempts = if (retry) 3 else 1
        for (attempt in 0 until attempts) {
            try {
                return withContext(Dispatchers.IO) {
                    val connection = origin.resolve(path).toURL().openConnection() as HttpsURLConnection
                    try {
                        connection.requestMethod = method
                        connection.instanceFollowRedirects = false
                        connection.connectTimeout = 20000
                        connection.readTimeout = 20000
                        connection.useCaches = false
                        connection.setRequestProperty("Accept", "application/json")
                        connection.setRequestProperty("Content-Type", "application/json")
                        connection.setRequestProperty("Cache-Control", "no-store")
                        token?.let { connection.setRequestProperty("Authorization", "Bearer $it") }
                        if (bytes != null) {
                            connection.doOutput = true
                            connection.setFixedLengthStreamingMode(bytes.size)
                            connection.outputStream.use { it.write(bytes) }
                        }
                        val status = connection.responseCode
                        val expected = if (method == "DELETE") 204 else 200
                        if (status != expected) throw HttpFailure(status)
                        if (method == "DELETE") null else {
                            Wire.requireSafe(connection.contentType?.substringBefore(';')?.trim() == "application/json")
                            val response = connection.inputStream.use { input ->
                                val output = ByteArrayOutputStream()
                                val buffer = ByteArray(4096)
                                while (true) {
                                    val count = input.read(buffer)
                                    if (count == -1) break
                                    Wire.requireSafe(output.size() + count <= 65536)
                                    output.write(buffer, 0, count)
                                }
                                output.toByteArray()
                            }
                            JSONObject(String(response, Charsets.UTF_8))
                        }
                    } finally { connection.disconnect() }
                }
            } catch (error: Exception) {
                val transient = (error is HttpFailure && error.status in setOf(408, 429, 500, 502, 503, 504)) ||
                    (error is IOException && error !is javax.net.ssl.SSLException)
                if (!transient || attempt + 1 == attempts) throw error
                delay((1L shl attempt) * 1000 + Random.nextLong(250))
            }
        }
        throw CompanionFailure("Sync did not complete.")
    }
    suspend fun pair(code: String): JSONObject {
        Wire.requireSafe(code.matches(Regex("^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{10}$")))
        val body = JSONObject().put("code", code).put("provider", "health_connect").put("deviceName", "GrowthTrack Android companion")
        // Single-use redeem is not automatically retried after an uncertain response.
        return Wire.credentials(request("POST", "/api/health-companions/pairings/redeem", body)!!)
    }
    suspend fun connection(credentials: JSONObject, permissions: JSONObject? = null) {
        val result = request(if (permissions == null) "GET" else "PUT",
            if (permissions == null) "/api/health-companions/connection" else "/api/health-companions/connection/consent",
            permissions?.let { JSONObject().put("permissions", it) }, Wire.string(credentials, "accessToken"), true)!!
        Wire.keys(result, setOf("connectionId", "provider", "status", "permissions", "lastReceivedAt"))
        Wire.requireSafe(Wire.string(result, "connectionId") == Wire.string(credentials, "connectionId") &&
            Wire.string(result, "provider") == "health_connect")
        if (Wire.string(result, "status") == "revoked") throw HttpFailure(410)
        Wire.requireSafe(Wire.string(result, "status") == "active")
        if (!result.isNull("lastReceivedAt")) Wire.instant(Wire.string(result, "lastReceivedAt"))
        val returned = result.getJSONObject("permissions")
        Wire.keys(returned, Metric.entries.map { it.wire }.toSet())
        for (metric in Metric.entries) {
            val permission = returned.getJSONObject(metric.wire)
            Wire.keys(permission, setOf("optedIn", "access"))
            val selected = Wire.bool(permission, "optedIn")
            val access = Wire.string(permission, "access")
            Wire.requireSafe(access in setOf("not_requested", "unknown", "granted", "denied", "unavailable") &&
                (selected || access == "not_requested"))
            permissions?.getJSONObject(metric.wire)?.let {
                Wire.requireSafe(Wire.bool(it, "optedIn") == selected && Wire.string(it, "access") == access)
            }
        }
    }
    suspend fun upload(batch: JSONObject, credentials: JSONObject): String {
        val result = request("POST", "/api/health-companions/batches", batch, Wire.string(credentials, "accessToken"), true)!!
        Wire.keys(result, setOf("batchId", "accepted", "syncedAt"))
        Wire.requireSafe(SyncPolicy.ackMatches(Wire.string(batch, "batchId"), Wire.string(result, "batchId"), Wire.bool(result, "accepted")))
        return Wire.string(result, "syncedAt").also { Wire.instant(it) }
    }
    suspend fun disconnect(credentials: JSONObject) {
        try { request("DELETE", "/api/health-companions/connection", token = Wire.string(credentials, "accessToken"), retry = true) }
        catch (error: HttpFailure) { if (error.status != 410) throw error }
    }
}
