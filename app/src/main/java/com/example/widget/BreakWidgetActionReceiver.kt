package com.example.widget

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.example.alarm.AlarmController
import com.example.data.BreakRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class BreakWidgetActionReceiver : BroadcastReceiver() {

    companion object {
        const val ACTION_TOGGLE_BREAK = "com.example.ACTION_TOGGLE_BREAK"
        const val ACTION_STOP_ALARM = "com.example.ACTION_STOP_ALARM"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val repository = BreakRepository(context)

        when (intent.action) {
            ACTION_TOGGLE_BREAK -> {
                CoroutineScope(Dispatchers.IO).launch {
                    val prefs = repository.preferences
                    if (prefs.isOnBreak) {
                        repository.endBreak()
                    } else {
                        repository.startBreak()
                    }
                }
            }
            ACTION_STOP_ALARM -> {
                AlarmController.stopAlarm(context)
                BreakWidgetProvider.updateAllWidgets(context)
            }
        }
    }
}
