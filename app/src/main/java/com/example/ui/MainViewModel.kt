package com.example.ui

import android.app.Application
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.os.Build
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.alarm.AlarmController
import com.example.data.BreakRecord
import com.example.data.BreakRepository
import com.example.widget.BreakWidgetProvider
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class MainViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = BreakRepository(application)
    private val prefs = repository.preferences

    private val _uiState = MutableStateFlow(
        BreakUiState(
            selectedYearMonth = prefs.getCurrentYearMonth(),
            autoMonthlyResetEnabled = prefs.autoMonthlyResetEnabled
        )
    )
    val uiState: StateFlow<BreakUiState> = _uiState.asStateFlow()

    private var tickerJob: Job? = null
    private var observeJob: Job? = null
    private var observeMonthJob: Job? = null
    private var currentObservedCycle: String = ""

    init {
        viewModelScope.launch {
            repository.checkAndPerformMonthlyReset()
        }
        observeBreaks()
        observeMonthBreaks(_uiState.value.selectedYearMonth)
        startTicker()
    }

    private fun observeBreaks() {
        observeJob?.cancel()
        currentObservedCycle = prefs.getCurrentCycleDate()
        observeJob = viewModelScope.launch {
            repository.getTodayBreaksFlow().collect { records ->
                val completedSeconds = records.sumOf { it.durationSeconds }
                _uiState.update { current ->
                    current.copy(
                        todayBreaks = records,
                        completedBreaksSeconds = completedSeconds
                    )
                }
                recalculateState()
            }
        }
    }

    private fun observeMonthBreaks(yearMonth: String) {
        observeMonthJob?.cancel()
        observeMonthJob = viewModelScope.launch {
            repository.getBreaksForMonthFlow(yearMonth).collect { records ->
                _uiState.update { current ->
                    current.copy(
                        selectedYearMonth = yearMonth,
                        monthBreaks = records
                    )
                }
            }
        }
    }

    private fun startTicker() {
        tickerJob?.cancel()
        tickerJob = viewModelScope.launch {
            while (isActive) {
                // Check if cycle or month changed while app was open
                val activeCycle = prefs.getCurrentCycleDate()
                if (activeCycle != currentObservedCycle) {
                    repository.checkAndPerformMonthlyReset()
                    observeBreaks()
                }
                recalculateState()
                delay(1000L)
            }
        }
    }

    private fun recalculateState() {
        prefs.checkDayRollover()
        val isOnBreak = prefs.isOnBreak
        val startTime = prefs.currentBreakStartTime
        val now = System.currentTimeMillis()

        val activeBreakElapsed = if (isOnBreak && startTime > 0) {
            ((now - startTime) / 1000).coerceAtLeast(0)
        } else 0L

        val completed = _uiState.value.completedBreaksSeconds
        val totalUsed = completed + activeBreakElapsed
        val limitMinutes = prefs.dailyLimitMinutes
        val limitSeconds = limitMinutes * 60L
        val remaining = limitSeconds - totalUsed

        val is3MinWarning = isOnBreak && remaining in 1..180
        val isLimitExceeded = isOnBreak && remaining <= 0

        _uiState.update { current ->
            current.copy(
                isOnBreak = isOnBreak,
                activeBreakElapsedSeconds = activeBreakElapsed,
                totalUsedSeconds = totalUsed,
                remainingSeconds = remaining,
                limitMinutes = limitMinutes,
                isAlarmRinging = prefs.isAlarmRinging || AlarmController.isRinging(),
                isThreeMinuteWarning = is3MinWarning,
                isLimitExceeded = isLimitExceeded,
                autoResetHour = prefs.autoResetHour,
                autoResetMinute = prefs.autoResetMinute,
                autoResetEnabled = prefs.autoResetEnabled,
                autoMonthlyResetEnabled = prefs.autoMonthlyResetEnabled
            )
        }
    }

    fun selectTab(tab: Int) {
        _uiState.update { it.copy(selectedTab = tab) }
    }

    fun navigateMonth(monthOffset: Int) {
        val current = _uiState.value.selectedYearMonth
        val sdf = SimpleDateFormat("yyyy-MM", Locale.getDefault())
        try {
            val date = sdf.parse(current) ?: Date()
            val cal = Calendar.getInstance().apply {
                time = date
                add(Calendar.MONTH, monthOffset)
            }
            val newYearMonth = sdf.format(cal.time)
            observeMonthBreaks(newYearMonth)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun toggleBreak() {
        viewModelScope.launch {
            if (prefs.isOnBreak) {
                repository.endBreak()
            } else {
                repository.startBreak()
            }
            recalculateState()
        }
    }

    fun stopAlarm() {
        repository.stopAlarm()
        recalculateState()
    }

    fun testAlarm() {
        viewModelScope.launch {
            _uiState.update { it.copy(isTestingAlarm = true) }
            AlarmController.startAlarm(getApplication(), "Test dźwięku alarmu (3 minuty)")
            recalculateState()
        }
    }

    fun stopTestAlarm() {
        viewModelScope.launch {
            AlarmController.stopAlarm(getApplication())
            _uiState.update { it.copy(isTestingAlarm = false) }
            recalculateState()
        }
    }

    fun deleteBreak(record: BreakRecord) {
        viewModelScope.launch {
            repository.deleteBreak(record)
            recalculateState()
        }
    }

    fun resetToday() {
        viewModelScope.launch {
            repository.resetToday()
            recalculateState()
        }
    }

    fun clearCurrentMonthHistory() {
        viewModelScope.launch {
            val month = _uiState.value.selectedYearMonth
            repository.clearMonthHistory(month)
            recalculateState()
        }
    }

    fun clearAllHistory() {
        viewModelScope.launch {
            repository.clearAllHistory()
            recalculateState()
        }
    }

    fun updateLimitMinutes(minutes: Int) {
        prefs.dailyLimitMinutes = minutes
        recalculateState()
        BreakWidgetProvider.updateAllWidgets(getApplication())
    }

    fun updateAutoResetTime(hour: Int, minute: Int) {
        viewModelScope.launch {
            repository.updateAutoResetTime(hour, minute)
            observeBreaks()
            recalculateState()
        }
    }

    fun toggleAutoMonthlyReset(enabled: Boolean) {
        prefs.autoMonthlyResetEnabled = enabled
        repository.setAutoMonthlyResetEnabled(enabled)
        _uiState.update { it.copy(autoMonthlyResetEnabled = enabled) }
    }

    fun requestPinWidget(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val appWidgetManager = AppWidgetManager.getInstance(getApplication())
            val myProvider = ComponentName(getApplication(), BreakWidgetProvider::class.java)
            if (appWidgetManager.isRequestPinAppWidgetSupported) {
                return appWidgetManager.requestPinAppWidget(myProvider, null, null)
            }
        }
        return false
    }

    override fun onCleared() {
        super.onCleared()
        tickerJob?.cancel()
        observeJob?.cancel()
        observeMonthJob?.cancel()
    }
}
