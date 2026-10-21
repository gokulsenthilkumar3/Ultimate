package com.growthtrack.health

import org.json.JSONArray
import org.json.JSONObject
import java.net.URI
import java.time.Instant
import java.util.UUID

enum class Metric(val wire: String) { WEIGHT("weight"), STEPS("steps"), SLEEP("sleep"), WORKOUTS("workouts") }

class CompanionFailure(val safeMessage: String) : Exception(safeMessage)
class HttpFailure(val status: Int) : Exception("HTTP $status")

object Wire {
    fun origin(input: String): URI {
        val uri = try { URI(input) } catch (_: Exception) { throw CompanionFailure("Enter an HTTPS server origin.") }
        requireSafe(uri.scheme == "https" && !uri.host.isNullOrBlank() && uri.rawUserInfo == null &&
            uri.rawQuery == null && uri.rawFragment == null && (uri.path.isNullOrEmpty() || uri.path == "/"))
        return uri
    }
    fun requireSafe(condition: Boolean) {
        if (!condition) throw CompanionFailure("Protocol validation failed; sync cursor was not advanced.")
    }
    fun id(value: String) = value.isNotEmpty() && value.length <= 256 && value.none { it.isWhitespace() || it.isISOControl() }
    fun instant(value: String): Instant {
        requireSafe(value.endsWith("Z"))
        return try { Instant.parse(value) } catch (_: Exception) { throw CompanionFailure("Invalid UTC instant.") }
    }
    fun keys(value: JSONObject, expected: Set<String>) { requireSafe(value.keys().asSequence().toSet() == expected) }
    fun string(value: JSONObject, field: String): String {
        val result = value.get(field)
        requireSafe(result is String)
        return result as String
    }
    fun bool(value: JSONObject, field: String): Boolean {
        val result = value.get(field)
        requireSafe(result is Boolean)
        return result as Boolean
    }
    fun credentials(value: JSONObject): JSONObject {
        keys(value, setOf("connectionId", "provider", "accessToken", "expiresAt"))
        val connectionId = string(value, "connectionId")
        requireSafe(UUID.fromString(connectionId).toString().equals(connectionId, ignoreCase = true))
        requireSafe(string(value, "provider") == "health_connect")
        requireSafe(string(value, "accessToken").matches(Regex("^[A-Za-z0-9_-]{32,512}$")))
        requireSafe(instant(string(value, "expiresAt")) > Instant.now())
        return value
    }
    fun batch(connectionId: String, metric: Metric, start: Instant, end: Instant,
              samples: List<JSONObject>, deletions: List<JSONObject>): JSONObject {
        requireSafe(end > start && end.epochSecond - start.epochSecond <= 8 * 86400 && samples.size + deletions.size <= 200)
        val ids = mutableSetOf<String>()
        for (sample in samples) {
            keys(sample, setOf("kind", "source", "startAt", "endAt", "value"))
            requireSafe(string(sample, "kind") == metric.wire)
            val source = sample.getJSONObject("source")
            keys(source, setOf("provider", "externalId", "origin", "modifiedAt"))
            requireSafe(string(source, "provider") == "health_connect" && id(string(source, "origin")))
            val externalId = string(source, "externalId")
            requireSafe(id(externalId) && ids.add(externalId))
            instant(string(source, "modifiedAt"))
            val from = instant(string(sample, "startAt"))
            val to = instant(string(sample, "endAt"))
            requireSafe(from >= start && to <= end && if (metric == Metric.WEIGHT) from == to else to > from)
            val value = sample.getJSONObject("value")
            when (metric) {
                Metric.WEIGHT -> {
                    keys(value, setOf("kilograms"))
                    val kg = value.get("kilograms")
                    requireSafe(kg is Number && kg.toDouble().isFinite() && kg.toDouble() > 0 && kg.toDouble() <= 1000)
                }
                Metric.STEPS -> {
                    keys(value, setOf("count"))
                    val count = value.get("count")
                    requireSafe(count is Long || count is Int)
                    requireSafe((count as Number).toLong() in 0..9007199254740991L)
                }
                Metric.SLEEP -> { keys(value, setOf("stage")); requireSafe(string(value, "stage") == "session") }
                Metric.WORKOUTS -> {
                    keys(value, setOf("activityCode", "durationSeconds"))
                    requireSafe(id(string(value, "activityCode")))
                    val duration = value.get("durationSeconds")
                    requireSafe(duration is Number && duration.toDouble().isFinite() && duration.toDouble() > 0 &&
                        duration.toDouble() <= java.time.Duration.between(from, to).toNanos() / 1e9 + 0.001)
                }
            }
        }
        for (deletion in deletions) {
            keys(deletion, setOf("kind", "source"))
            requireSafe(string(deletion, "kind") == metric.wire)
            val source = deletion.getJSONObject("source")
            keys(source, setOf("provider", "externalId"))
            requireSafe(string(source, "provider") == "health_connect" && id(string(source, "externalId")) &&
                ids.add(string(source, "externalId")))
        }
        return JSONObject().put("protocolVersion", 1).put("connectionId", connectionId)
            .put("batchId", UUID.randomUUID().toString()).put("metric", metric.wire)
            .put("windowStart", start.toString()).put("windowEnd", end.toString())
            .put("samples", JSONArray(samples)).put("deletions", JSONArray(deletions))
    }
}
