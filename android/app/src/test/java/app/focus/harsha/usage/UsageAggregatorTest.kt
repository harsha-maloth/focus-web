package app.focus.harsha.usage

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class UsageAggregatorTest {
    private val resumed = UsageAggregator.RESUMED
    private val paused = UsageAggregator.PAUSED

    private fun ev(pkg: String, cls: String, type: Int, t: Long) = RawEvent(pkg, cls, type, t)

    @Test
    fun addsTimeBetweenResumeAndPause() {
        val r = UsageAggregator.foregroundMs(
            listOf(ev("a", "A", resumed, 1_000), ev("a", "A", paused, 61_000)),
            100_000,
        )
        assertEquals(60_000L, r["a"])
    }

    @Test
    fun keepsAppsApart() {
        val r = UsageAggregator.foregroundMs(
            listOf(
                ev("a", "A", resumed, 0), ev("a", "A", paused, 30_000),
                ev("b", "B", resumed, 30_000), ev("b", "B", paused, 90_000),
            ),
            100_000,
        )
        assertEquals(30_000L, r["a"])
        assertEquals(60_000L, r["b"])
    }

    @Test
    fun sumsSeveralActivitiesOfOneApp() {
        val r = UsageAggregator.foregroundMs(
            listOf(
                ev("a", "A", resumed, 0), ev("a", "A", paused, 10_000),
                ev("a", "B", resumed, 10_000), ev("a", "B", paused, 25_000),
            ),
            100_000,
        )
        assertEquals(25_000L, r["a"])
    }

    @Test
    fun countsAnOpenActivityUpToTheEnd() {
        val r = UsageAggregator.foregroundMs(listOf(ev("a", "A", resumed, 1_000)), 4_000)
        assertEquals(3_000L, r["a"])
    }

    @Test
    fun ignoresAPauseWithNoResume() {
        val r = UsageAggregator.foregroundMs(listOf(ev("a", "A", paused, 5_000)), 100_000)
        assertTrue(r.isEmpty())
    }

    @Test
    fun ignoresOtherEventTypes() {
        val r = UsageAggregator.foregroundMs(
            listOf(ev("a", "A", 7, 0), ev("a", "A", 23, 50_000)),
            100_000,
        )
        assertTrue(r.isEmpty())
    }
}
