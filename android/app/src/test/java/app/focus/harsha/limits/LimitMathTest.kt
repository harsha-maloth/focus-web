package app.focus.harsha.limits

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LimitMathTest {
    @Test
    fun overOnlyAtOrAboveLimit() {
        assertFalse(LimitMath.isOver(usedMs = 59_999, limitMs = 60_000))
        assertTrue(LimitMath.isOver(usedMs = 60_000, limitMs = 60_000))
        assertTrue(LimitMath.isOver(usedMs = 90_000, limitMs = 60_000))
    }

    @Test
    fun zeroLimitMeansNoLimit() {
        assertFalse(LimitMath.isOver(usedMs = 1_000_000, limitMs = 0))
    }

    @Test
    fun remainingNeverNegative() {
        assertEquals(10_000L, LimitMath.remainingMs(50_000, 60_000))
        assertEquals(0L, LimitMath.remainingMs(70_000, 60_000))
    }

    @Test
    fun minutesConvert() {
        assertEquals(1_800_000L, LimitMath.minutesToMs(30))
    }

    @Test
    fun ownAppAndSystemUiAreNeverBlocked() {
        assertTrue(LimitMath.neverBlocked("app.focus.harsha", "app.focus.harsha"))
        assertTrue(LimitMath.neverBlocked("com.android.systemui", "app.focus.harsha"))
        assertFalse(LimitMath.neverBlocked("com.example.game", "app.focus.harsha"))
    }
}
