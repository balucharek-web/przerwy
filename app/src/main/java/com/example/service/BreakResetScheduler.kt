package com.example.service

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.example.data.BreakPreferences
import java.util.Calendar

object BreakResetScheduler {
    private const val TAG = "BreakResetScheduler"
    private const val REQUEST_CODE_RESET = 8801

    fun scheduleNextReset(context: Context) {
        val prefs = BreakPreferences(context)
        if (!prefs.autoResetEnabled) {
            cancelScheduledReset(context)
            return
        }

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return

        val now = Calendar.getInstance()
        val target = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, prefs.autoResetHour)
            set(Calendar.MINUTE, prefs.autoResetMinute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
            // If time for today already passed, schedule for tomorrow
            if (timeInMillis <= now.timeInMillis) {
                add(Calendar.DAY_OF_YEAR, 1)
            }
        }

        val intent = Intent(context, BreakResetReceiver::class.java).apply {
            action = BreakResetReceiver.ACTION_DAILY_RESET
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            REQUEST_CODE_RESET,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, target.timeInMillis, pendingIntent)
            } else {
                alarmManager.set(AlarmManager.RTC_WAKEUP, target.timeInMillis, pendingIntent)
            }
            Log.d(TAG, "Scheduled next reset for: ${target.time}")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to schedule reset alarm", e)
        }
    }

    fun cancelScheduledReset(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        val intent = Intent(context, BreakResetReceiver::class.java).apply {
            action = BreakResetReceiver.ACTION_DAILY_RESET
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            REQUEST_CODE_RESET,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        alarmManager.cancel(pendingIntent)
    }
}
