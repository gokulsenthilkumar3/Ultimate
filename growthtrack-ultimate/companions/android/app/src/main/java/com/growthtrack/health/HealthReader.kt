package com.growthtrack.health

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.changes.DeletionChange
import androidx.health.connect.client.changes.UpsertionChange
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.Record
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.request.ChangesTokenRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import org.json.JSONObject
import java.time.Duration
import java.time.Instant
import kotlin.reflect.KClass

data class HealthPage(val samples: List<JSONObject>, val deletions: List<JSONObject>,
                     val nextCursor: JSONObject, val end: Instant, val complete: Boolean)

class HealthReader(private val context: Context) {
    val availability: Int get() = HealthConnectClient.getSdkStatus(context)
    private fun client(): HealthConnectClient {
        if (availability != HealthConnectClient.SDK_AVAILABLE)
            throw CompanionFailure("Health Connect is unavailable or needs installation/update.")
        return HealthConnectClient.getOrCreate(context)
    }
    private fun recordType(metric: Metric): KClass<out Record> = when (metric) {
        Metric.WEIGHT -> WeightRecord::class
        Metric.STEPS -> StepsRecord::class
        Metric.SLEEP -> SleepSessionRecord::class
        Metric.WORKOUTS -> ExerciseSessionRecord::class
    }
    fun permission(metric: Metric): String = HealthPermission.getReadPermission(recordType(metric))
    suspend fun granted(): Set<String> = if (availability == HealthConnectClient.SDK_AVAILABLE)
        client().permissionController.getGrantedPermissions() else emptySet()

    suspend fun newCursor(metric: Metric): JSONObject {
        val now = Instant.now()
        // Acquire the changes token BEFORE the snapshot to close the snapshot/change-log race.
        val token = client().getChangesToken(ChangesTokenRequest(setOf(recordType(metric))))
        return JSONObject().put("windowStart", now.minusSeconds(7 * 86400).toString())
            .put("windowEnd", now.toString()).put("createdAt", now.toString())
            .put("phase", "bootstrap").put("changesToken", token)
    }
    private suspend inline fun <reified T : Record> snapshot(cursor: JSONObject): Pair<List<Record>, String?> {
        val response = client().readRecords(ReadRecordsRequest(
            recordType = T::class,
            timeRangeFilter = TimeRangeFilter.between(Wire.instant(cursor.getString("windowStart")),
                Wire.instant(cursor.getString("windowEnd"))),
            pageSize = 200, pageToken = cursor.optString("pageToken").takeIf { it.isNotEmpty() },
        ))
        return response.records to response.pageToken
    }
    suspend fun read(metric: Metric, cursor: JSONObject): HealthPage {
        if (permission(metric) !in granted()) throw SecurityException("Health permission revoked")
        val start = Wire.instant(cursor.getString("windowStart"))
        val next = JSONObject(cursor.toString())
        if (cursor.getString("phase") == "bootstrap") {
            val (records, pageToken) = when (metric) {
                Metric.WEIGHT -> snapshot<WeightRecord>(cursor)
                Metric.STEPS -> snapshot<StepsRecord>(cursor)
                Metric.SLEEP -> snapshot<SleepSessionRecord>(cursor)
                Metric.WORKOUTS -> snapshot<ExerciseSessionRecord>(cursor)
            }
            val end = Wire.instant(cursor.getString("windowEnd"))
            val samples = records.mapNotNull { map(it, metric, start, end) }
            if (pageToken == null) { next.remove("pageToken"); next.put("phase", "changes") }
            else next.put("pageToken", pageToken)
            return HealthPage(samples, emptyList(), next, end, false)
        }
        val response = client().getChanges(cursor.getString("changesToken"))
        if (response.changesTokenExpired) throw CompanionFailure("Changes token expired; a bounded reread is needed.")
        Wire.requireSafe(response.changes.size <= 1000)
        val end = Instant.now()
        val samples = mutableListOf<JSONObject>()
        val deletions = mutableListOf<JSONObject>()
        // The request tracks one record type; deletion records carry no type or data origin.
        for (change in response.changes) when (change) {
            is UpsertionChange -> map(change.record, metric, start, end)?.let { samples.add(it) }
            is DeletionChange -> deletions.add(JSONObject().put("kind", metric.wire).put("source",
                JSONObject().put("provider", "health_connect").put("externalId", change.recordId)))
        }
        next.put("changesToken", response.nextChangesToken)
        return HealthPage(samples, deletions, next, end, !response.hasMore)
    }
    private fun map(record: Record, metric: Metric, windowStart: Instant, windowEnd: Instant): JSONObject? {
        val start: Instant
        val end: Instant
        val value: JSONObject
        when (record) {
            is WeightRecord -> {
                Wire.requireSafe(metric == Metric.WEIGHT)
                start = record.time; end = record.time
                value = JSONObject().put("kilograms", record.weight.inKilograms)
            }
            is StepsRecord -> {
                Wire.requireSafe(metric == Metric.STEPS)
                start = record.startTime; end = record.endTime
                value = JSONObject().put("count", record.count)
            }
            is SleepSessionRecord -> {
                Wire.requireSafe(metric == Metric.SLEEP)
                start = record.startTime; end = record.endTime
                // Session bounds are not asleep duration. No synthetic sleep stages or scores.
                value = JSONObject().put("stage", "session")
            }
            is ExerciseSessionRecord -> {
                Wire.requireSafe(metric == Metric.WORKOUTS)
                start = record.startTime; end = record.endTime
                value = JSONObject().put("activityCode", "hc:${record.exerciseType}")
                    .put("durationSeconds", Duration.between(start, end).toNanos() / 1e9)
            }
            else -> throw CompanionFailure("Unsupported Health Connect record type.")
        }
        if (start < windowStart || end > windowEnd) return null
        val metadata = record.metadata
        return JSONObject().put("kind", metric.wire).put("source", JSONObject()
            .put("provider", "health_connect").put("externalId", metadata.id)
            .put("origin", metadata.dataOrigin.packageName).put("modifiedAt", metadata.lastModifiedTime.toString()))
            .put("startAt", start.toString()).put("endAt", end.toString()).put("value", value)
    }
}
