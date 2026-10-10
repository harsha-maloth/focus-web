package app.focus.harsha.limits

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SessionMathTest {
    private val start = 1_000_000L
    private val planned = 25 * 60_000L

    @Test
    fun remainingCountsDownAndStopsAtZero() {
        assertEquals(planned, SessionMath.remainingMs(start, planned, start))
        assertEquals(planned - 60_000L, SessionMath.remainingMs(start, planned, start + 60_000L))
        assertEquals(0L, SessionMath.remainingMs(start, planned, start + planned + 5_000L))
    }

    @Test
    fun finishedExactlyAtPlannedEnd() {
        assertFalse(SessionMath.isFinished(start, planned, start + planned - 1))
        assertTrue(SessionMath.isFinished(start, planned, start + planned))
    }

    @Test
    fun creditedIsClampedToZeroAndPlanned() {
        assertEquals(120_000L, SessionMath.creditedMs(start, planned, start + 120_000L))
        assertEquals(planned, SessionMath.creditedMs(start, planned, start + planned * 3))
        assertEquals(0L, SessionMath.creditedMs(start, planned, start - 5_000L))
    }

    @Test
    fun minutesLeftRoundsUp() {
        assertEquals(1, SessionMath.minutesLeftCeil(1))
        assertEquals(1, SessionMath.minutesLeftCeil(60_000))
        assertEquals(2, SessionMath.minutesLeftCeil(60_001))
        assertEquals(0, SessionMath.minutesLeftCeil(0))
    }

    @Test
    fun allowedMeansOwnIgnoredOrListed() {
        val allowed = setOf("com.notes")
        val ignored = setOf("com.keyboard")
        assertTrue(SessionMath.isAllowed("app.focus.harsha", allowed, ignored, "app.focus.harsha"))
        assertTrue(SessionMath.isAllowed("com.keyboard", allowed, ignored, "app.focus.harsha"))
        assertTrue(SessionMath.isAllowed("com.notes", allowed, ignored, "app.focus.harsha"))
        assertFalse(SessionMath.isAllowed("com.game", allowed, ignored, "app.focus.harsha"))
    }
}
