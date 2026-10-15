package com.example

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.example.data.AppDatabase
import com.example.data.BreakPreferences
import com.example.data.BreakRecord
import com.example.ui.formatHoursMinutes
import com.example.ui.formatMinutesSeconds
import com.example.ui.formatMonthName
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.util.Calendar

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class ExampleRobolectricTest {

    @Test
    fun `read string from context`() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val appName = context.getString(R.string.app_name)
        assertEquals("Czas Przerwy", appName)
    }

    @Test
    fun `test formatMinutesSeconds helper`() {
        assertEquals("00:00", formatMinutesSeconds(0))
        assertEquals("01:30", formatMinutesSeconds(90))
        assertEquals("30:00", formatMinutesSeconds(1800))
        assertEquals("03:00", formatMinutesSeconds(180))
    }

    @Test
    fun `test formatHoursMinutes helper`() {
        assertEquals("0 min", formatHoursMinutes(0))
        assertEquals("25 min", formatHoursMinutes(1500))
        assertEquals("1h 15m", formatHoursMinutes(4500))
    }

    @Test
    fun `test formatMonthName helper`() {
        val result = formatMonthName("2026-10")
        assertTrue(result.contains("2026"))
        assertTrue(result.lowercase().contains("październik"))
    }

    @Test
    fun `test break preferences start and end break`() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val prefs = BreakPreferences(context)

        prefs.resetDayFlags()
        assertFalse(prefs.isOnBreak)

        val startTime = System.currentTimeMillis() - 5000L
        prefs.startBreak(startTime)
        assertTrue(prefs.isOnBreak)
        assertEquals(startTime, prefs.currentBreakStartTime)

        val duration = prefs.endBreak()
        assertFalse(prefs.isOnBreak)
        assertTrue(duration >= 5L)
    }

    @Test
    fun `test auto reset cycle date calculation`() {
        // Date 2026-10-15 05:30:00 with reset at 06:00 -> belongs to cycle 2026-10-14
        val calMorning = Calendar.getInstance().apply {
            set(2026, Calendar.OCTOBER, 15, 5, 30, 0)
        }
        val cycleBeforeReset = BreakPreferences.calculateCycleDate(calMorning.timeInMillis, 6, 0)
        assertEquals("2026-10-14", cycleBeforeReset)

        // Date 2026-10-15 06:15:00 with reset at 06:00 -> belongs to cycle 2026-10-15
        val calAfterReset = Calendar.getInstance().apply {
            set(2026, Calendar.OCTOBER, 15, 6, 15, 0)
        }
        val cycleAfterReset = BreakPreferences.calculateCycleDate(calAfterReset.timeInMillis, 6, 0)
        assertEquals("2026-10-15", cycleAfterReset)
    }

    @Test
    fun `test monthly database operations and clearing`() = runBlocking {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val db = AppDatabase.getInstance(context)
        val dao = db.breakRecordDao()

        dao.clearAllBreaks()

        val record1 = BreakRecord(
            dateString = "2026-10-10",
            startTimeMs = 1000000L,
            endTimeMs = 1000600L,
            durationSeconds = 600L
        )
        val record2 = BreakRecord(
            dateString = "2026-10-15",
            startTimeMs = 2000000L,
            endTimeMs = 2000450L,
            durationSeconds = 450L
        )
        val record3 = BreakRecord(
            dateString = "2026-09-20",
            startTimeMs = 500000L,
            endTimeMs = 500300L,
            durationSeconds = 300L
        )

        dao.insert(record1)
        dao.insert(record2)
        dao.insert(record3)

        val octBreaks = dao.getBreaksForMonthSync("2026-10")
        assertEquals(2, octBreaks.size)

        val sepBreaks = dao.getBreaksForMonthSync("2026-09")
        assertEquals(1, sepBreaks.size)

        // Clear September breaks
        dao.clearBreaksForMonth("2026-09")
        val sepAfter = dao.getBreaksForMonthSync("2026-09")
        assertEquals(0, sepAfter.size)

        // October breaks still remain
        val octAfter = dao.getBreaksForMonthSync("2026-10")
        assertEquals(2, octAfter.size)
    }
}
