package com.example.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.example.MainActivity
import com.example.R
import com.example.alarm.AlarmController
import com.example.data.AppDatabase
import com.example.data.BreakPreferences
import com.example.widget.BreakWidgetActionReceiver
import com.example.widget.BreakWidgetProvider
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class BreakService : Service() {

    private val serviceScope = CoroutineScope(Dispatchers.Main + Job())
    private var timerJob: Job? = null
    private lateinit var notificationManager: NotificationManager
    private lateinit var prefs: BreakPreferences
    private lateinit var db: AppDatabase

    companion object {
        const val ACTION_START_BREAK = "com.example.service.ACTION_START_BREAK"
        const val ACTION_STOP_BREAK = "com.example.service.ACTION_STOP_BREAK"
        const val ACTION_STOP_ALARM = "com.example.service.ACTION_STOP_ALARM"

        const val CHANNEL_TIMER_ID = "break_timer_channel"
        const val CHANNEL_ALARM_ID = "break_alarm_channel"
        const val NOTIFICATION_TIMER_ID = 1001
        const val NOTIFICATION_ALARM_ID = 1002

        fun formatSeconds(totalSeconds: Long): String {
            val s = totalSeconds.coerceAtLeast(0)
            val minutes = s / 60
            val seconds = s % 60
            return String.format("%02d:%02d", minutes, seconds)
        }
    }

    override fun onCreate() {
        super.onCreate()
        notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        prefs = BreakPreferences(this)
        db = AppDatabase.getInstance(this)
        createNotificationChannels()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP_BREAK -> {
                stopTimer()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
            ACTION_STOP_ALARM -> {
                AlarmController.stopAlarm(this)
                notificationManager.cancel(NOTIFICATION_ALARM_ID)
                BreakWidgetProvider.updateAllWidgets(this)
            }
            else -> {
                startForeground(NOTIFICATION_TIMER_ID, buildTimerNotification("Rozpoczynanie przerwy...", "Pozostało: 30:00"))
                startTimer()
            }
        }
        return START_STICKY
    }

    private fun startTimer() {
        timerJob?.cancel()
        timerJob = serviceScope.launch(Dispatchers.IO) {
            var widgetUpdateCounter = 0
            while (isActive) {
                if (!prefs.isOnBreak) {
                    stopForeground(STOP_FOREGROUND_REMOVE)
                    stopSelf()
                    break
                }

                val now = System.currentTimeMillis()
                val startTime = prefs.currentBreakStartTime
                val currentBreakElapsed = if (startTime > 0) ((now - startTime) / 1000).coerceAtLeast(0) else 0L

                prefs.checkDayRollover()
                val today = prefs.getCurrentCycleDate()
                val completedBreaks = db.breakRecordDao().getBreaksForDateSync(today)
                val completedSeconds = completedBreaks.sumOf { it.durationSeconds }

                val totalUsedSeconds = completedSeconds + currentBreakElapsed
                val limitSeconds = prefs.dailyLimitMinutes * 60L
                val remainingSeconds = limitSeconds - totalUsedSeconds

                // Check 3-minute remaining alarm trigger (<= 180 seconds)
                if (remainingSeconds in 1..180 && !prefs.alarm3MinFired) {
                    prefs.alarm3MinFired = true
                    AlarmController.startAlarm(this@BreakService, "Zostały tylko 3 minuty przerwy!")
                    showAlarmNotification("⏰ Uwaga! Kończy się przerwa", "Zostało tylko ${formatSeconds(remainingSeconds)} limitu!")
                }

                // Check limit exhausted alarm (<= 0 seconds)
                if (remainingSeconds <= 0 && !prefs.alarmExceededFired) {
                    prefs.alarmExceededFired = true
                    AlarmController.startAlarm(this@BreakService, "Limit przerwy wyczerpany!")
                    showAlarmNotification("🚨 Koniec limitu przerwy!", "Wykorzystano całe 30 minut przerwy!")
                }

                val contentTitle = "☕ Na przerwie: ${formatSeconds(currentBreakElapsed)}"
                val contentText = if (remainingSeconds >= 0) {
                    "Pozostały limit: ${formatSeconds(remainingSeconds)} z ${prefs.dailyLimitMinutes} min"
                } else {
                    "Przekroczono o: ${formatSeconds(-remainingSeconds)}!"
                }

                notificationManager.notify(
                    NOTIFICATION_TIMER_ID,
                    buildTimerNotification(contentTitle, contentText)
                )

                widgetUpdateCounter++
                if (widgetUpdateCounter % 2 == 0) {
                    BreakWidgetProvider.updateAllWidgets(this@BreakService)
                }

                delay(1000L)
            }
        }
    }

    private fun stopTimer() {
        timerJob?.cancel()
        timerJob = null
    }

    private fun buildTimerNotification(title: String, text: String): Notification {
        val appIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val appPendingIntent = PendingIntent.getActivity(
            this,
            0,
            appIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Stop break action
        val stopBreakIntent = Intent(this, BreakWidgetActionReceiver::class.java).apply {
            action = BreakWidgetActionReceiver.ACTION_TOGGLE_BREAK
        }
        val stopBreakPendingIntent = PendingIntent.getBroadcast(
            this,
            1,
            stopBreakIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_TIMER_ID)
            .setSmallIcon(R.drawable.ic_coffee_break)
            .setContentTitle(title)
            .setContentText(text)
            .setOngoing(true)
            .setContentIntent(appPendingIntent)
            .addAction(
                R.drawable.ic_work_check,
                "Zakończ przerwę (Powrót)",
                stopBreakPendingIntent
            )
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_WORKOUT)
            .setOnlyAlertOnce(true)
            .build()
    }

    private fun showAlarmNotification(title: String, text: String) {
        val appIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val appPendingIntent = PendingIntent.getActivity(
            this,
            2,
            appIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val stopAlarmIntent = Intent(this, BreakWidgetActionReceiver::class.java).apply {
            action = BreakWidgetActionReceiver.ACTION_STOP_ALARM
        }
        val stopAlarmPendingIntent = PendingIntent.getBroadcast(
            this,
            3,
            stopAlarmIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ALARM_ID)
            .setSmallIcon(R.drawable.ic_alarm_bell)
            .setContentTitle(title)
            .setContentText(text)
            .setContentIntent(appPendingIntent)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(false)
            .setOngoing(true)
            .addAction(
                R.drawable.ic_alarm_bell,
                "Wyłącz alarm",
                stopAlarmPendingIntent
            )
            .build()

        notificationManager.notify(NOTIFICATION_ALARM_ID, notification)
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val timerChannel = NotificationChannel(
                CHANNEL_TIMER_ID,
                "Licznik trwającej przerwy",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Wyświetla aktualny czas spędzony na przerwie i pozostały limit"
                setShowBadge(false)
            }

            val alarmChannel = NotificationChannel(
                CHANNEL_ALARM_ID,
                "Alarm końca przerwy",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Głośne powiadomienie alarmowe, gdy do końca przerwy zostaną 3 minuty"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 600, 300, 600, 300, 1000)
            }

            notificationManager.createNotificationChannel(timerChannel)
            notificationManager.createNotificationChannel(alarmChannel)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        stopTimer()
        serviceScope.cancel()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
