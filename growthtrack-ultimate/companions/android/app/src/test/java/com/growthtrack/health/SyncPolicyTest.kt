package com.growthtrack.health

import org.junit.Assert.*
import org.junit.Test
import java.time.Instant

class SyncPolicyTest {
    private val now = Instant.parse("2026-09-29T00:00:00Z")
    @Test fun cursorExpiresAt24HoursAndAfterClockRollback() {
        assertTrue(SyncPolicy.shouldRotate(null, now))
        assertFalse(SyncPolicy.shouldRotate(now.minusSeconds(86399), now))
        assertTrue(SyncPolicy.shouldRotate(now.minusSeconds(86400), now))
        assertTrue(SyncPolicy.shouldRotate(now.plusSeconds(1), now))
    }
    @Test fun explicitConsentAndActualGrantAreBothRequired() {
        assertTrue(SyncPolicy.canRead(true, true, false))
        assertFalse(SyncPolicy.canRead(false, true, false))
        assertFalse(SyncPolicy.canRead(true, false, false))
        assertFalse(SyncPolicy.canRead(true, true, true))
    }
    @Test fun cursorMayAdvanceOnlyForItsOwnAtomicAcknowledgement() {
        assertTrue(SyncPolicy.ackMatches("a", "a", true))
        assertFalse(SyncPolicy.ackMatches("a", "b", true))
        assertFalse(SyncPolicy.ackMatches("a", "a", false))
    }
}
