package com.example.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.example.MainActivity
import com.example.R
import com.example.alarm.AlarmController
import com.example.data.BreakPreferences
import com.example.widget.BreakWidgetProvider
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class BreakResetReceiver : BroadcastReceiver() {

    companion object {
        const val ACTION_DAILY_RESET = "com.example.service.ACTION_DAILY_RESET"
        private const val CHANNEL_RESET_ID = "break_reset_channel"
        private const val NOTIFICATION_RESET_ID = 2001
    }

    override fun onReceive(context: Context, intent: Intent) {
        val prefs = BreakPreferences(context)

        // Reschedule next occurrence
        BreakResetScheduler.scheduleNextReset(context)

        val repo = com.example.data.BreakRepository(context)
        kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.IO).launch {
            repo.checkAndPerformMonthlyReset()
        }

        when (intent.action) {
            ACTION_DAILY_RESET -> {
                // If break is currently running or alarms are sounding, reset them
                prefs.resetDayFlags()
                AlarmController.stopAlarm(context)

                // Update widgets immediately
                BreakWidgetProvider.updateAllWidgets(context)

                // Show notification to user that limit has refreshed
                showResetNotification(context, prefs.dailyLimitMinutes)
            }
            Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED -> {
                prefs.checkDayRollover()
                BreakWidgetProvider.updateAllWidgets(context)
            }
        }
    }

    private fun showResetNotification(context: Context, limitMinutes: Int) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_RESET_ID,
                "Automatyczny reset limitu",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Powiadomienia o odnowieniu dziennego limitu przerw"
            }
            notificationManager.createNotificationChannel(channel)
        }

        val appIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            appIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_RESET_ID)
            .setSmallIcon(R.drawable.ic_coffee_break)
            .setContentTitle("Dzienny limit odnowiony!")
            .setContentText("Twój limit $limitMinutes minut przerwy został zresetowany na nowy dzień roboczy.")
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()

        notificationManager.notify(NOTIFICATION_RESET_ID, notification)
    }
}
