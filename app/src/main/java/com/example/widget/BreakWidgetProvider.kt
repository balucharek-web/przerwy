package com.example.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.view.View
import android.widget.RemoteViews
import com.example.MainActivity
import com.example.R
import com.example.data.AppDatabase
import com.example.data.BreakPreferences
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class BreakWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onEnabled(context: Context) {
        updateAllWidgets(context)
    }

    companion object {
        fun updateAllWidgets(context: Context) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val componentName = ComponentName(context, BreakWidgetProvider::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
            for (appWidgetId in appWidgetIds) {
                updateAppWidget(context, appWidgetManager, appWidgetId)
            }
        }

        fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            CoroutineScope(Dispatchers.IO).launch {
                val views = RemoteViews(context.packageName, R.layout.widget_break)
                val prefs = BreakPreferences(context)
                val db = AppDatabase.getInstance(context)

                prefs.checkDayRollover()
                val today = prefs.getCurrentCycleDate()
                val breaks = db.breakRecordDao().getBreaksForDateSync(today)
                val completedSeconds = breaks.sumOf { it.durationSeconds }

                val isOnBreak = prefs.isOnBreak
                val currentBreakElapsed = if (isOnBreak && prefs.currentBreakStartTime > 0) {
                    ((System.currentTimeMillis() - prefs.currentBreakStartTime) / 1000).coerceAtLeast(0)
                } else 0L

                val totalUsedSeconds = completedSeconds + currentBreakElapsed
                val limitSeconds = prefs.dailyLimitMinutes * 60L
                val remainingSeconds = limitSeconds - totalUsedSeconds

                // App Launch PendingIntent
                val appIntent = Intent(context, MainActivity::class.java)
                val appPendingIntent = PendingIntent.getActivity(
                    context,
                    100,
                    appIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_header, appPendingIntent)
                views.setOnClickPendingIntent(R.id.widget_body, appPendingIntent)

                // Toggle Break PendingIntent
                val toggleIntent = Intent(context, BreakWidgetActionReceiver::class.java).apply {
                    action = BreakWidgetActionReceiver.ACTION_TOGGLE_BREAK
                }
                val togglePendingIntent = PendingIntent.getBroadcast(
                    context,
                    200,
                    toggleIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_btn_action, togglePendingIntent)

                // Dismiss Alarm PendingIntent
                val alarmIntent = Intent(context, BreakWidgetActionReceiver::class.java).apply {
                    action = BreakWidgetActionReceiver.ACTION_STOP_ALARM
                }
                val alarmPendingIntent = PendingIntent.getBroadcast(
                    context,
                    300,
                    alarmIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_btn_alarm, alarmPendingIntent)

                // Remaining time display format
                val remainingText = if (remainingSeconds >= 0) {
                    formatDuration(remainingSeconds)
                } else {
                    "- " + formatDuration(-remainingSeconds) + " !"
                }
                views.setTextViewText(R.id.widget_remaining_time, remainingText)

                if (isOnBreak) {
                    views.setTextViewText(R.id.widget_status_text, "☕ NA PRZERWIE")
                    views.setTextColor(R.id.widget_status_text, Color.parseColor("#F59E0B"))
                    views.setTextViewText(
                        R.id.widget_secondary_text,
                        "Bieżąca przerwa: ${formatDuration(currentBreakElapsed)} • Razem: ${formatDuration(totalUsedSeconds)}"
                    )
                    views.setTextViewText(R.id.widget_btn_action, "🔴 ZAKOŃCZ PRZERWĘ (POWRÓT)")
                    views.setInt(R.id.widget_btn_action, "setBackgroundResource", R.drawable.bg_widget_button_break)
                } else {
                    views.setTextViewText(R.id.widget_status_text, "💼 W PRACY")
                    views.setTextColor(R.id.widget_status_text, Color.parseColor("#10B981"))
                    views.setTextViewText(
                        R.id.widget_secondary_text,
                        "Wykorzystano: ${formatDuration(totalUsedSeconds)} • ${breaks.size} ${breaksLabel(breaks.size)}"
                    )
                    views.setTextViewText(R.id.widget_btn_action, "🟢 ROZPOCZNIJ PRZERWĘ (WYJŚCIE)")
                    views.setInt(R.id.widget_btn_action, "setBackgroundResource", R.drawable.bg_widget_button_working)
                }

                // Show Alarm Dismiss button if alarm is ringing
                if (prefs.isAlarmRinging) {
                    views.setViewVisibility(R.id.widget_btn_alarm, View.VISIBLE)
                } else {
                    views.setViewVisibility(R.id.widget_btn_alarm, View.GONE)
                }

                appWidgetManager.updateAppWidget(appWidgetId, views)
            }
        }

        private fun formatDuration(seconds: Long): String {
            val s = seconds.coerceAtLeast(0)
            val m = s / 60
            val sec = s % 60
            return String.format("%02dm %02ds", m, sec)
        }

        private fun breaksLabel(count: Int): String {
            return when {
                count == 1 -> "przerwa"
                count in 2..4 -> "przerwy"
                else -> "przerw"
            }
        }
    }
}
