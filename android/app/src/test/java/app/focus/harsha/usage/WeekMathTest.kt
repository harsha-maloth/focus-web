package app.focus.harsha.usage

import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class WeekMathTest {
    @Test
    fun lastDaysEndsToday_oldestFirst() {
        val days = WeekMath.lastDays(LocalDate.of(2026, 10, 10))
        assertEquals(7, days.size)
        assertEquals(LocalDate.of(2026, 10, 4), days.first())
        assertEquals(LocalDate.of(2026, 10, 10), days.last())
    }

    @Test
    fun lastDaysCrossesMonthBoundary() {
        val days = WeekMath.lastDays(LocalDate.of(2026, 3, 2))
        assertEquals(LocalDate.of(2026, 2, 24), days.first())
    }

    @Test
    fun neverReplacesWithEmptyOrShorter() {
        assertFalse(WeekMath.shouldReplace(storedMs = 5_000, newMs = 0))
        assertFalse(WeekMath.shouldReplace(storedMs = 5_000, newMs = 4_000))
    }

    @Test
    fun replacesWhenFirstSeenOrLarger() {
        assertTrue(WeekMath.shouldReplace(storedMs = 0, newMs = 1_000))
        assertTrue(WeekMath.shouldReplace(storedMs = 5_000, newMs = 5_000))
        assertTrue(WeekMath.shouldReplace(storedMs = 5_000, newMs = 9_000))
    }

    @Test
    fun averageSkipsEmptyDays() {
        assertEquals(30L, WeekMath.averageMs(listOf(0, 20, 40, 0)))
        assertEquals(0L, WeekMath.averageMs(listOf(0, 0)))
    }
}
