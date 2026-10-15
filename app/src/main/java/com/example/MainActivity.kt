package com.example

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.ui.BreakScreen
import com.example.ui.MainViewModel
import com.example.ui.theme.MyApplicationTheme

class MainActivity : ComponentActivity() {

    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            MyApplicationTheme {
                val state by viewModel.uiState.collectAsStateWithLifecycle()

                // Notification permission launcher for Android 13+
                val permissionLauncher = rememberLauncherForActivityResult(
                    contract = ActivityResultContracts.RequestPermission()
                ) { /* Handle permission response */ }

                LaunchedEffect(Unit) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        if (ContextCompat.checkSelfPermission(
                                this@MainActivity,
                                Manifest.permission.POST_NOTIFICATIONS
                            ) != PackageManager.PERMISSION_GRANTED
                        ) {
                            permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                        }
                    }
                }

                BreakScreen(
                    state = state,
                    onSelectTab = { tab -> viewModel.selectTab(tab) },
                    onNavigateMonth = { offset -> viewModel.navigateMonth(offset) },
                    onClearMonthHistory = { viewModel.clearCurrentMonthHistory() },
                    onClearAllHistory = { viewModel.clearAllHistory() },
                    onToggleAutoMonthlyReset = { enabled -> viewModel.toggleAutoMonthlyReset(enabled) },
                    onToggleBreak = { viewModel.toggleBreak() },
                    onStopAlarm = { viewModel.stopAlarm() },
                    onTestAlarm = { viewModel.testAlarm() },
                    onStopTestAlarm = { viewModel.stopTestAlarm() },
                    onDeleteBreak = { record -> viewModel.deleteBreak(record) },
                    onResetToday = { viewModel.resetToday() },
                    onUpdateLimitMinutes = { minutes -> viewModel.updateLimitMinutes(minutes) },
                    onUpdateAutoResetTime = { hour, minute -> viewModel.updateAutoResetTime(hour, minute) },
                    onRequestPinWidget = { viewModel.requestPinWidget() }
                )
            }
        }
    }
}
