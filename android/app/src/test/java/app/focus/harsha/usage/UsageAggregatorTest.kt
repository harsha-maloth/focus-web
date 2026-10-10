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

    @Test
    fun unclosedActivitiesDoNotStack() {
        // a opens two activities and never pauses them; b then takes over. a must stop at 10_000.
        val r = UsageAggregator.foregroundMs(
            listOf(
                ev("a", "A", resumed, 0), ev("a", "B", resumed, 5_000),
                ev("b", "X", resumed, 10_000), ev("b", "X", paused, 40_000),
            ),
            100_000,
        )
        assertEquals(10_000L, r["a"])
        assertEquals(30_000L, r["b"])
    }

    @Test
    fun totalNeverExceedsTheWindow() {
        val events = (0 until 50).map { ev("p${it % 5}", "C$it", resumed, it * 1_000L) }
        val r = UsageAggregator.foregroundMs(events, 100_000)
        assertTrue(r.values.sum() <= 100_000L)
    }

    @Test
    fun screenOffClosesTheOpenApp() {
        val r = UsageAggregator.foregroundMs(
            listOf(ev("a", "A", resumed, 0), ev("", "", UsageAggregator.SCREEN_OFF, 20_000)),
            1_000_000,
        )
        assertEquals(20_000L, r["a"])
    }

    @Test
    fun aLatePauseOfAnEarlierAppIsIgnored() {
        val r = UsageAggregator.foregroundMs(
            listOf(
                ev("a", "A", resumed, 0), ev("b", "B", resumed, 10_000),
                ev("a", "A", paused, 12_000), ev("b", "B", paused, 30_000),
            ),
            100_000,
        )
        assertEquals(10_000L, r["a"])
        assertEquals(20_000L, r["b"])
    }
}
