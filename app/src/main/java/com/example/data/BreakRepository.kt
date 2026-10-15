package com.example.data

import android.content.Context
import android.content.Intent
import com.example.alarm.AlarmController
import com.example.service.BreakResetScheduler
import com.example.service.BreakService
import com.example.widget.BreakWidgetProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext

class BreakRepository(private val context: Context) {
    private val db = AppDatabase.getInstance(context)
    private val dao = db.breakRecordDao()
    val preferences = BreakPreferences(context)

    init {
        // Ensure scheduler is active
        BreakResetScheduler.scheduleNextReset(context)
    }

    suspend fun checkAndPerformMonthlyReset() = withContext(Dispatchers.IO) {
        if (preferences.autoMonthlyResetEnabled && preferences.checkMonthlyRollover()) {
            val currentYearMonth = preferences.getCurrentYearMonth()
            // Clears records before current month
            dao.clearBreaksOlderThan("${currentYearMonth}-01")
            BreakWidgetProvider.updateAllWidgets(context)
        }
    }

    fun getTodayBreaksFlow(): Flow<List<BreakRecord>> {
        val cycleDate = preferences.getCurrentCycleDate()
        return dao.getBreaksForDate(cycleDate)
    }

    fun getBreaksForMonthFlow(yearMonth: String): Flow<List<BreakRecord>> {
        return dao.getBreaksForMonth(yearMonth)
    }

    suspend fun getTodayCompletedSeconds(): Long = withContext(Dispatchers.IO) {
        val cycleDate = preferences.getCurrentCycleDate()
        val records = dao.getBreaksForDateSync(cycleDate)
        records.sumOf { it.durationSeconds }
    }

    suspend fun startBreak() = withContext(Dispatchers.IO) {
        val now = System.currentTimeMillis()
        preferences.startBreak(now)

        // Start Foreground service for timer & alarm countdown
        val serviceIntent = Intent(context, BreakService::class.java).apply {
            action = BreakService.ACTION_START_BREAK
        }
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        BreakWidgetProvider.updateAllWidgets(context)
    }

    suspend fun endBreak() = withContext(Dispatchers.IO) {
        val startTime = preferences.currentBreakStartTime
        val duration = preferences.endBreak()

        if (startTime > 0 && duration > 0) {
            val record = BreakRecord(
                dateString = preferences.getCurrentCycleDate(startTime),
                startTimeMs = startTime,
                endTimeMs = System.currentTimeMillis(),
                durationSeconds = duration
            )
            dao.insert(record)
        }

        // Stop any ringing alarm
        AlarmController.stopAlarm(context)

        // Stop foreground service
        val serviceIntent = Intent(context, BreakService::class.java).apply {
            action = BreakService.ACTION_STOP_BREAK
        }
        context.stopService(serviceIntent)

        BreakWidgetProvider.updateAllWidgets(context)
    }

    suspend fun deleteBreak(record: BreakRecord) = withContext(Dispatchers.IO) {
        dao.delete(record)
        BreakWidgetProvider.updateAllWidgets(context)
    }

    suspend fun resetToday() = withContext(Dispatchers.IO) {
        val cycleDate = preferences.getCurrentCycleDate()
        dao.clearBreaksForDate(cycleDate)
        preferences.resetDayFlags()
        AlarmController.stopAlarm(context)

        val serviceIntent = Intent(context, BreakService::class.java).apply {
            action = BreakService.ACTION_STOP_BREAK
        }
        context.stopService(serviceIntent)

        BreakWidgetProvider.updateAllWidgets(context)
    }

    suspend fun clearMonthHistory(yearMonth: String) = withContext(Dispatchers.IO) {
        dao.clearBreaksForMonth(yearMonth)
        // If current month, also reset today
        if (yearMonth == preferences.getCurrentYearMonth()) {
            preferences.resetDayFlags()
            AlarmController.stopAlarm(context)
        }
        BreakWidgetProvider.updateAllWidgets(context)
    }

    suspend fun clearAllHistory() = withContext(Dispatchers.IO) {
        dao.clearAllBreaks()
        preferences.resetDayFlags()
        AlarmController.stopAlarm(context)
        BreakWidgetProvider.updateAllWidgets(context)
    }

    fun stopAlarm() {
        AlarmController.stopAlarm(context)
        BreakWidgetProvider.updateAllWidgets(context)
    }

    fun updateAutoResetTime(hour: Int, minute: Int) {
        preferences.autoResetHour = hour
        preferences.autoResetMinute = minute
        BreakResetScheduler.scheduleNextReset(context)
        BreakWidgetProvider.updateAllWidgets(context)
    }

    fun setAutoMonthlyResetEnabled(enabled: Boolean) {
        preferences.autoMonthlyResetEnabled = enabled
    }
}
