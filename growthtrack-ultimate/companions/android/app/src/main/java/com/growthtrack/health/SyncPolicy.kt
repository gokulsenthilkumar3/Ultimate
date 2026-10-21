package com.growthtrack.health

import java.time.Duration
import java.time.Instant

object SyncPolicy {
    const val MAX_PAGES = 20
    fun shouldRotate(createdAt: Instant?, now: Instant): Boolean = createdAt == null ||
        now < createdAt || Duration.between(createdAt, now).seconds >= 86400
    fun canRead(optedIn: Boolean, granted: Boolean, disconnectPending: Boolean): Boolean =
        optedIn && granted && !disconnectPending
    fun ackMatches(batchId: String, ackBatchId: String, accepted: Boolean): Boolean =
        accepted && batchId == ackBatchId
}
