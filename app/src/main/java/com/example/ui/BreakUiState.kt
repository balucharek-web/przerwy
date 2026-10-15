package com.example.ui

import com.example.data.BreakRecord

data class BreakUiState(
    val selectedTab: Int = 0, // 0 = Dzisiaj, 1 = Historia miesiąca
    val isOnBreak: Boolean = false,
    val activeBreakElapsedSeconds: Long = 0L,
    val completedBreaksSeconds: Long = 0L,
    val totalUsedSeconds: Long = 0L,
    val remainingSeconds: Long = 30 * 60L,
    val limitMinutes: Int = 30,
    val todayBreaks: List<BreakRecord> = emptyList(),
    val isAlarmRinging: Boolean = false,
    val isThreeMinuteWarning: Boolean = false,
    val isLimitExceeded: Boolean = false,
    val isTestingAlarm: Boolean = false,
    val autoResetHour: Int = 6,
    val autoResetMinute: Int = 0,
    val autoResetEnabled: Boolean = true,
    val selectedYearMonth: String = "", // e.g. "2026-10"
    val monthBreaks: List<BreakRecord> = emptyList(),
    val autoMonthlyResetEnabled: Boolean = true
) {
    val progressFraction: Float
        get() {
            val total = limitMinutes * 60f
            if (total <= 0f) return 1f
            return (totalUsedSeconds.toFloat() / total).coerceIn(0f, 1f)
        }

    val remainingFraction: Float
        get() = (1f - progressFraction).coerceIn(0f, 1f)

    val formattedResetTime: String
        get() = String.format("%02d:%02d", autoResetHour, autoResetMinute)

    val monthTotalSeconds: Long
        get() = monthBreaks.sumOf { it.durationSeconds }

    val monthBreaksCount: Int
        get() = monthBreaks.size

    val monthActiveDaysCount: Int
        get() = monthBreaks.map { it.dateString }.distinct().size

    val monthBreaksByDay: Map<String, List<BreakRecord>>
        get() = monthBreaks.groupBy { it.dateString }
}
