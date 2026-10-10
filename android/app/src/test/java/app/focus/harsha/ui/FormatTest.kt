package app.focus.harsha.ui

import org.junit.Assert.assertEquals
import org.junit.Test

class FormatTest {
    @Test
    fun formatsMinutesAndHours() {
        assertEquals("0 min", formatDuration(0))
        assertEquals("45 min", formatDuration(2_700_000))
        assertEquals("1 h", formatDuration(3_600_000))
        assertEquals("2 h 5 min", formatDuration(7_500_000))
    }

    @Test
    fun neverNegative() {
        assertEquals("0 min", formatDuration(-5_000))
    }
}
