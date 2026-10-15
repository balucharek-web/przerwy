package com.example.data

import android.content.Context
import android.content.SharedPreferences
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class BreakPreferences(context: Context) {
    private val prefs: SharedPreferences = context.applicationContext.getSharedPreferences(
        PREFS_NAME,
        Context.MODE_PRIVATE
    )

    companion object {
        private const val PREFS_NAME = "work_break_prefs"
        private const val KEY_IS_ON_BREAK = "is_on_break"
        private const val KEY_CURRENT_BREAK_START = "current_break_start"
        private const val KEY_DAILY_LIMIT_MINUTES = "daily_limit_minutes"
        private const val KEY_LAST_CYCLE_DATE = "last_cycle_date"
        private const val KEY_ALARM_3MIN_FIRED = "alarm_3min_fired"
        private const val KEY_ALARM_EXCEEDED_FIRED = "alarm_exceeded_fired"
        private const val KEY_IS_ALARM_RINGING = "is_alarm_ringing"
        private const val KEY_AUTO_RESET_HOUR = "auto_reset_hour"
        private const val KEY_AUTO_RESET_MINUTE = "auto_reset_minute"
        private const val KEY_AUTO_RESET_ENABLED = "auto_reset_enabled"
        private const val KEY_AUTO_MONTHLY_RESET_ENABLED = "auto_monthly_reset_enabled"
        private const val KEY_LAST_MONTH_RESET = "last_month_reset"

        fun calculateCycleDate(nowMs: Long, resetHour: Int, resetMinute: Int): String {
            val offsetMs = (resetHour * 60L + resetMinute) * 60L * 1000L
            val cycleMs = nowMs - offsetMs
            val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            return sdf.format(Date(cycleMs))
        }
    }

    init {
        checkDayRollover()
    }

    fun getCurrentCycleDate(nowMs: Long = System.currentTimeMillis()): String {
        return calculateCycleDate(nowMs, autoResetHour, autoResetMinute)
    }

    fun getCurrentYearMonth(nowMs: Long = System.currentTimeMillis()): String {
        val cycleDate = getCurrentCycleDate(nowMs)
        return if (cycleDate.length >= 7) cycleDate.substring(0, 7) else cycleDate
    }

    fun checkDayRollover(): Boolean {
        val currentCycle = getCurrentCycleDate()
        val lastCycle = prefs.getString(KEY_LAST_CYCLE_DATE, null)
        if (lastCycle != currentCycle) {
            prefs.edit()
                .putString(KEY_LAST_CYCLE_DATE, currentCycle)
                .putBoolean(KEY_IS_ON_BREAK, false)
                .putLong(KEY_CURRENT_BREAK_START, 0L)
                .putBoolean(KEY_ALARM_3MIN_FIRED, false)
                .putBoolean(KEY_ALARM_EXCEEDED_FIRED, false)
                .putBoolean(KEY_IS_ALARM_RINGING, false)
                .apply()
            return true
        }
        return false
    }

    fun checkMonthlyRollover(): Boolean {
        val currentMonth = getCurrentYearMonth()
        val lastMonth = prefs.getString(KEY_LAST_MONTH_RESET, null)
        if (lastMonth == null) {
            prefs.edit().putString(KEY_LAST_MONTH_RESET, currentMonth).apply()
            return false
        }
        if (lastMonth != currentMonth) {
            prefs.edit().putString(KEY_LAST_MONTH_RESET, currentMonth).apply()
            return true
        }
        return false
    }

    var isOnBreak: Boolean
        get() {
            checkDayRollover()
            return prefs.getBoolean(KEY_IS_ON_BREAK, false)
        }
        set(value) = prefs.edit().putBoolean(KEY_IS_ON_BREAK, value).apply()

    var currentBreakStartTime: Long
        get() = prefs.getLong(KEY_CURRENT_BREAK_START, 0L)
        set(value) = prefs.edit().putLong(KEY_CURRENT_BREAK_START, value).apply()

    var dailyLimitMinutes: Int
        get() = prefs.getInt(KEY_DAILY_LIMIT_MINUTES, 30)
        set(value) = prefs.edit().putInt(KEY_DAILY_LIMIT_MINUTES, value).apply()

    var alarm3MinFired: Boolean
        get() = prefs.getBoolean(KEY_ALARM_3MIN_FIRED, false)
        set(value) = prefs.edit().putBoolean(KEY_ALARM_3MIN_FIRED, value).apply()

    var alarmExceededFired: Boolean
        get() = prefs.getBoolean(KEY_ALARM_EXCEEDED_FIRED, false)
        set(value) = prefs.edit().putBoolean(KEY_ALARM_EXCEEDED_FIRED, value).apply()

    var isAlarmRinging: Boolean
        get() = prefs.getBoolean(KEY_IS_ALARM_RINGING, false)
        set(value) = prefs.edit().putBoolean(KEY_IS_ALARM_RINGING, value).apply()

    var autoResetHour: Int
        get() = prefs.getInt(KEY_AUTO_RESET_HOUR, 6)
        set(value) {
            prefs.edit().putInt(KEY_AUTO_RESET_HOUR, value).apply()
            checkDayRollover()
        }

    var autoResetMinute: Int
        get() = prefs.getInt(KEY_AUTO_RESET_MINUTE, 0)
        set(value) {
            prefs.edit().putInt(KEY_AUTO_RESET_MINUTE, value).apply()
            checkDayRollover()
        }

    var autoResetEnabled: Boolean
        get() = prefs.getBoolean(KEY_AUTO_RESET_ENABLED, true)
        set(value) = prefs.edit().putBoolean(KEY_AUTO_RESET_ENABLED, value).apply()

    var autoMonthlyResetEnabled: Boolean
        get() = prefs.getBoolean(KEY_AUTO_MONTHLY_RESET_ENABLED, true)
        set(value) = prefs.edit().putBoolean(KEY_AUTO_MONTHLY_RESET_ENABLED, value).apply()

    fun startBreak(startTimeMs: Long = System.currentTimeMillis()) {
        prefs.edit()
            .putBoolean(KEY_IS_ON_BREAK, true)
            .putLong(KEY_CURRENT_BREAK_START, startTimeMs)
            .putBoolean(KEY_ALARM_3MIN_FIRED, false)
            .putBoolean(KEY_ALARM_EXCEEDED_FIRED, false)
            .putBoolean(KEY_IS_ALARM_RINGING, false)
            .apply()
    }

    fun endBreak(): Long {
        val start = currentBreakStartTime
        val now = System.currentTimeMillis()
        val durationSeconds = if (start > 0) ((now - start) / 1000).coerceAtLeast(1L) else 0L

        prefs.edit()
            .putBoolean(KEY_IS_ON_BREAK, false)
            .putLong(KEY_CURRENT_BREAK_START, 0L)
            .putBoolean(KEY_ALARM_3MIN_FIRED, false)
            .putBoolean(KEY_ALARM_EXCEEDED_FIRED, false)
            .putBoolean(KEY_IS_ALARM_RINGING, false)
            .apply()

        return durationSeconds
    }

    fun resetDayFlags() {
        prefs.edit()
            .putBoolean(KEY_IS_ON_BREAK, false)
            .putLong(KEY_CURRENT_BREAK_START, 0L)
            .putBoolean(KEY_ALARM_3MIN_FIRED, false)
            .putBoolean(KEY_ALARM_EXCEEDED_FIRED, false)
            .putBoolean(KEY_IS_ALARM_RINGING, false)
            .apply()
    }
}
