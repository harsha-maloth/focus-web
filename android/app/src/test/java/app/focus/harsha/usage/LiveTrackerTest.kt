package app.focus.harsha.usage

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class LiveTrackerTest {
    private fun total(credits: List<LiveTracker.Credit>, pkg: String) =
        credits.filter { it.pkg == pkg }.sumOf { it.ms }

    @Test
    fun creditsTheAppThatWasInFront() {
        val t = LiveTracker()
        t.onForeground("a", 0)
        val c = t.onForeground("b", 30_000)
        assertEquals(30_000L, total(c, "a"))
        assertEquals(20_000L, total(t.onTick(50_000), "b"))
    }

    @Test
    fun idleCreditsNothing() {
        val t = LiveTracker()
        assertTrue(t.onTick(60_000).isEmpty())
        t.onForeground(null, 70_000)
        assertTrue(t.onTick(100_000).isEmpty())
    }

    @Test
    fun screenOffStopsCounting() {
        val t = LiveTracker()
        t.onForeground("a", 0)
        assertEquals(20_000L, total(t.onScreenOff(20_000), "a"))
        assertTrue(t.onTick(1_000_000).isEmpty())
    }

    @Test
    fun aLongGapIsCappedNotCounted() {
        val t = LiveTracker(maxGapMs = 90_000)
        t.onForeground("a", 0)
        // The service was frozen for an hour: only the cap is credited.
        assertEquals(90_000L, total(t.onTick(3_600_000), "a"))
    }

    @Test
    fun totalNeverExceedsRealTimeWithCapOnTicks() {
        val t = LiveTracker()
        t.onForeground("a", 0)
        var sum = 0L
        for (i in 1..120) sum += total(t.onTick(i * 30_000L), "a")
        assertEquals(3_600_000L, sum)
    }

    @Test
    fun sameAppReportedTwiceKeepsCounting() {
        val t = LiveTracker()
        t.onForeground("a", 0)
        val c = t.onForeground("a", 10_000)
        assertEquals(10_000L, total(c, "a"))
        assertEquals(10_000L, total(t.onTick(20_000), "a"))
    }
}
