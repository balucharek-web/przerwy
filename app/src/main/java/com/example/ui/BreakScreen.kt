package com.example.ui

import android.content.Context
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AddAlert
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.DeleteSweep
import androidx.compose.material.icons.filled.FreeBreakfast
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.NotificationsOff
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.filled.Widgets
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.BreakRecord
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BreakScreen(
    state: BreakUiState,
    onSelectTab: (Int) -> Unit,
    onNavigateMonth: (Int) -> Unit,
    onClearMonthHistory: () -> Unit,
    onClearAllHistory: () -> Unit,
    onToggleAutoMonthlyReset: (Boolean) -> Unit,
    onToggleBreak: () -> Unit,
    onStopAlarm: () -> Unit,
    onTestAlarm: () -> Unit,
    onStopTestAlarm: () -> Unit,
    onDeleteBreak: (BreakRecord) -> Unit,
    onResetToday: () -> Unit,
    onUpdateLimitMinutes: (Int) -> Unit,
    onUpdateAutoResetTime: (Int, Int) -> Unit,
    onRequestPinWidget: () -> Boolean,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var showMenu by remember { mutableStateOf(false) }
    var showResetDialog by remember { mutableStateOf(false) }
    var showLimitDialog by remember { mutableStateOf(false) }
    var showAutoResetDialog by remember { mutableStateOf(false) }
    var showWidgetDialog by remember { mutableStateOf(false) }
    var showClearMonthDialog by remember { mutableStateOf(false) }
    var showClearAllDialog by remember { mutableStateOf(false) }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.FreeBreakfast,
                            contentDescription = null,
                            tint = if (state.isOnBreak) Color(0xFFF59E0B) else Color(0xFF10B981)
                        )
                        Text(
                            text = if (state.selectedTab == 0) "Czas Przerwy" else "Historia przerw",
                            fontWeight = FontWeight.Bold,
                            fontSize = 20.sp
                        )
                    }
                },
                actions = {
                    IconButton(
                        onClick = { showWidgetDialog = true },
                        modifier = Modifier.testTag("btn_pin_widget")
                    ) {
                        Icon(
                            imageVector = Icons.Default.Widgets,
                            contentDescription = "Widget na pulpit",
                            tint = MaterialTheme.colorScheme.onSurface
                        )
                    }
                    IconButton(onClick = { showMenu = true }) {
                        Icon(
                            imageVector = Icons.Default.MoreVert,
                            contentDescription = "Więcej opcji",
                            tint = MaterialTheme.colorScheme.onSurface
                        )
                    }
                    DropdownMenu(
                        expanded = showMenu,
                        onDismissRequest = { showMenu = false }
                    ) {
                        DropdownMenuItem(
                            text = { Text("Godzina auto-resetu (${state.formattedResetTime})") },
                            leadingIcon = { Icon(Icons.Default.Schedule, null, tint = MaterialTheme.colorScheme.primary) },
                            onClick = {
                                showMenu = false
                                showAutoResetDialog = true
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("Zmień limit (${state.limitMinutes} min)") },
                            leadingIcon = { Icon(Icons.Default.Tune, null) },
                            onClick = {
                                showMenu = false
                                showLimitDialog = true
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("Przetestuj alarm (3 min)") },
                            leadingIcon = { Icon(Icons.Default.AddAlert, null) },
                            onClick = {
                                showMenu = false
                                onTestAlarm()
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("Jak dodać widget") },
                            leadingIcon = { Icon(Icons.Default.Widgets, null) },
                            onClick = {
                                showMenu = false
                                showWidgetDialog = true
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("Wyczyść ten miesiąc", color = MaterialTheme.colorScheme.error) },
                            leadingIcon = { Icon(Icons.Default.DeleteSweep, null, tint = MaterialTheme.colorScheme.error) },
                            onClick = {
                                showMenu = false
                                showClearMonthDialog = true
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("Resetuj dzisiejszy dzień teraz", color = MaterialTheme.colorScheme.error) },
                            leadingIcon = { Icon(Icons.Default.Refresh, null, tint = MaterialTheme.colorScheme.error) },
                            onClick = {
                                showMenu = false
                                showResetDialog = true
                            }
                        )
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        bottomBar = {
            NavigationBar(
                containerColor = MaterialTheme.colorScheme.surface,
                tonalElevation = 8.dp
            ) {
                NavigationBarItem(
                    selected = state.selectedTab == 0,
                    onClick = { onSelectTab(0) },
                    icon = { Icon(Icons.Default.Timer, contentDescription = "Licznik") },
                    label = { Text("Licznik") },
                    modifier = Modifier.testTag("btn_tab_today"),
                    colors = NavigationBarItemDefaults.colors(
                        indicatorColor = MaterialTheme.colorScheme.primaryContainer
                    )
                )
                NavigationBarItem(
                    selected = state.selectedTab == 1,
                    onClick = { onSelectTab(1) },
                    icon = { Icon(Icons.Default.CalendarMonth, contentDescription = "Historia") },
                    label = { Text("Historia miesiąca") },
                    modifier = Modifier.testTag("btn_tab_monthly"),
                    colors = NavigationBarItemDefaults.colors(
                        indicatorColor = MaterialTheme.colorScheme.primaryContainer
                    )
                )
            }
        }
    ) { innerPadding ->
        if (state.selectedTab == 0) {
            // TAB 0: TODAY / MAIN DASHBOARD
            TodayDashboardView(
                state = state,
                innerPadding = innerPadding,
                onToggleBreak = onToggleBreak,
                onStopAlarm = onStopAlarm,
                onStopTestAlarm = onStopTestAlarm,
                onDeleteBreak = onDeleteBreak,
                onOpenAutoResetDialog = { showAutoResetDialog = true },
                onOpenWidgetDialog = { showWidgetDialog = true },
                onRequestPinWidget = onRequestPinWidget
            )
        } else {
            // TAB 1: MONTHLY HISTORY VIEW
            MonthlyHistoryView(
                state = state,
                innerPadding = innerPadding,
                onNavigateMonth = onNavigateMonth,
                onToggleAutoMonthlyReset = onToggleAutoMonthlyReset,
                onOpenClearMonthDialog = { showClearMonthDialog = true },
                onOpenClearAllDialog = { showClearAllDialog = true },
                onDeleteBreak = onDeleteBreak
            )
        }
    }

    // Dialog: Auto-Reset Hour & Minute
    if (showAutoResetDialog) {
        AutoResetDialog(
            currentHour = state.autoResetHour,
            currentMinute = state.autoResetMinute,
            onSave = { h, m ->
                showAutoResetDialog = false
                onUpdateAutoResetTime(h, m)
                Toast.makeText(context, "Limit będzie się resetował codziennie o %02d:%02d".format(h, m), Toast.LENGTH_SHORT).show()
            },
            onDismiss = { showAutoResetDialog = false }
        )
    }

    // Dialog: Reset Today
    if (showResetDialog) {
        AlertDialog(
            onDismissRequest = { showResetDialog = false },
            title = { Text("Zresetować dzisiejszy dzień teraz?") },
            text = { Text("Spowoduje to wyzerowanie dzisiejszych odbić i natychmiastowe przywrócenie pełnego limitu 30 minut.") },
            confirmButton = {
                Button(
                    onClick = {
                        showResetDialog = false
                        onResetToday()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                    modifier = Modifier.testTag("btn_reset_today")
                ) {
                    Text("Resetuj")
                }
            },
            dismissButton = {
                TextButton(onClick = { showResetDialog = false }) {
                    Text("Anuluj")
                }
            }
        )
    }

    // Dialog: Clear Month History
    if (showClearMonthDialog) {
        AlertDialog(
            onDismissRequest = { showClearMonthDialog = false },
            title = { Text("Wyczyścić historię z tego miesiąca?") },
            text = { Text("Wszystkie zapisane przerwy dla miesiąca ${formatMonthName(state.selectedYearMonth)} zostaną trwale usunięte.") },
            confirmButton = {
                Button(
                    onClick = {
                        showClearMonthDialog = false
                        onClearMonthHistory()
                        Toast.makeText(context, "Wyczyszczono historię miesiąca", Toast.LENGTH_SHORT).show()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                    modifier = Modifier.testTag("btn_confirm_clear_month")
                ) {
                    Text("Wyczyść miesiąc")
                }
            },
            dismissButton = {
                TextButton(onClick = { showClearMonthDialog = false }) {
                    Text("Anuluj")
                }
            }
        )
    }

    // Dialog: Clear All History
    if (showClearAllDialog) {
        AlertDialog(
            onDismissRequest = { showClearAllDialog = false },
            title = { Text("Wyczyścić całą historię?") },
            text = { Text("Wszystkie zarejestrowane przerwy ze wszystkich miesięcy zostaną bezpowrotnie usunięte.") },
            confirmButton = {
                Button(
                    onClick = {
                        showClearAllDialog = false
                        onClearAllHistory()
                        Toast.makeText(context, "Wyczyszczono całą historię", Toast.LENGTH_SHORT).show()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Text("Wyczyść wszystko")
                }
            },
            dismissButton = {
                TextButton(onClick = { showClearAllDialog = false }) {
                    Text("Anuluj")
                }
            }
        )
    }

    // Dialog: Change Limit
    if (showLimitDialog) {
        LimitSelectionDialog(
            currentLimit = state.limitMinutes,
            onSelectLimit = { newLimit ->
                showLimitDialog = false
                onUpdateLimitMinutes(newLimit)
            },
            onDismiss = { showLimitDialog = false }
        )
    }

    // Dialog: Widget Instructions & Pin
    if (showWidgetDialog) {
        WidgetInfoDialog(
            onPinWidget = {
                showWidgetDialog = false
                val success = onRequestPinWidget()
                if (success) {
                    Toast.makeText(context, "Dodano widget na pulpit!", Toast.LENGTH_SHORT).show()
                }
            },
            onDismiss = { showWidgetDialog = false }
        )
    }
}

@Composable
fun TodayDashboardView(
    state: BreakUiState,
    innerPadding: PaddingValues,
    onToggleBreak: () -> Unit,
    onStopAlarm: () -> Unit,
    onStopTestAlarm: () -> Unit,
    onDeleteBreak: (BreakRecord) -> Unit,
    onOpenAutoResetDialog: () -> Unit,
    onOpenWidgetDialog: () -> Unit,
    onRequestPinWidget: () -> Boolean
) {
    val context = LocalContext.current

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(innerPadding)
            .testTag("break_screen_scroll"),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Active Alarm Banner (3-min warning or limit exceeded or test)
        if (state.isAlarmRinging || state.isThreeMinuteWarning || state.isTestingAlarm) {
            item {
                AlarmBannerCard(
                    isTesting = state.isTestingAlarm,
                    is3MinWarning = state.isThreeMinuteWarning,
                    isLimitExceeded = state.isLimitExceeded,
                    onStopAlarm = {
                        if (state.isTestingAlarm) {
                            onStopTestAlarm()
                        } else {
                            onStopAlarm()
                        }
                    }
                )
            }
        }

        // Status Badge & Auto-Reset info badge
        item {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                StatusPill(isOnBreak = state.isOnBreak)

                // Auto-Reset Time clickable pill
                Surface(
                    color = Color(0xFF1E293B),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier
                        .clip(RoundedCornerShape(16.dp))
                        .clickable { onOpenAutoResetDialog() }
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Schedule,
                            contentDescription = null,
                            tint = Color(0xFF38BDF8),
                            modifier = Modifier.size(14.dp)
                        )
                        Text(
                            text = "Auto-reset codziennie o ${state.formattedResetTime}",
                            fontSize = 11.sp,
                            color = Color(0xFF94A3B8)
                        )
                    }
                }
            }
        }

        // Main Circular Gauge
        item {
            BreakGaugeView(
                remainingSeconds = state.remainingSeconds,
                totalUsedSeconds = state.totalUsedSeconds,
                limitMinutes = state.limitMinutes,
                remainingFraction = state.remainingFraction,
                isOnBreak = state.isOnBreak,
                activeElapsed = state.activeBreakElapsedSeconds
            )
        }

        // Big Action Punch Button
        item {
            BigPunchButton(
                isOnBreak = state.isOnBreak,
                activeElapsedSeconds = state.activeBreakElapsedSeconds,
                onClick = onToggleBreak
            )
        }

        // 3-Metric Summary Cards
        item {
            SummaryMetricsRow(
                remainingSeconds = state.remainingSeconds,
                usedSeconds = state.totalUsedSeconds,
                breaksCount = state.todayBreaks.size
            )
        }

        // Quick Widget Hint Card
        item {
            WidgetHintCard(
                onOpenDialog = onOpenWidgetDialog,
                onDirectPin = {
                    val pinned = onRequestPinWidget()
                    if (pinned) {
                        Toast.makeText(context, "Poproszono o dodanie widgetu na pulpit!", Toast.LENGTH_SHORT).show()
                    } else {
                        onOpenWidgetDialog()
                    }
                }
            )
        }

        // History Section Header
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.History,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Text(
                        text = "Dzisiejsze odbicia",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
                if (state.todayBreaks.isNotEmpty()) {
                    Text(
                        text = "${state.todayBreaks.size} ${breaksCountLabel(state.todayBreaks.size)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        // History Items or Empty State
        if (state.todayBreaks.isEmpty()) {
            item {
                EmptyBreaksCard()
            }
        } else {
            itemsIndexed(
                items = state.todayBreaks,
                key = { _, item -> item.id }
            ) { index, record ->
                BreakItemCard(
                    index = state.todayBreaks.size - index,
                    record = record,
                    onDelete = { onDeleteBreak(record) }
                )
            }
        }
    }
}

@Composable
fun MonthlyHistoryView(
    state: BreakUiState,
    innerPadding: PaddingValues,
    onNavigateMonth: (Int) -> Unit,
    onToggleAutoMonthlyReset: (Boolean) -> Unit,
    onOpenClearMonthDialog: () -> Unit,
    onOpenClearAllDialog: () -> Unit,
    onDeleteBreak: (BreakRecord) -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(innerPadding)
            .testTag("monthly_history_scroll"),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Month Selector Bar
        item {
            MonthSelectorCard(
                yearMonth = state.selectedYearMonth,
                onPreviousMonth = { onNavigateMonth(-1) },
                onNextMonth = { onNavigateMonth(1) }
            )
        }

        // Monthly Summary 4-Metrics Card
        item {
            MonthlySummaryCard(
                totalSeconds = state.monthTotalSeconds,
                breaksCount = state.monthBreaksCount,
                activeDaysCount = state.monthActiveDaysCount
            )
        }

        // Monthly Auto-Reset & Cleaning Settings Card
        item {
            MonthlyResetSettingsCard(
                autoResetEnabled = state.autoMonthlyResetEnabled,
                onToggleAutoReset = onToggleAutoMonthlyReset,
                onClearCurrentMonth = onOpenClearMonthDialog,
                onClearAll = onOpenClearAllDialog
            )
        }

        // List Header
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Dni robocze w tym miesiącu",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "${state.monthBreaksByDay.keys.size} dni",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        // Empty state or Days grouping
        if (state.monthBreaksByDay.isEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(28.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.CalendarMonth,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(44.dp)
                        )
                        Text(
                            text = "Brak zarejestrowanych przerw w tym miesiącu",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 15.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "Gdy będziesz odbijać przerwy, pojawią się tutaj podsumowania dla każdego dnia.",
                            fontSize = 12.sp,
                            textAlign = TextAlign.Center,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        } else {
            // Group by days, sorted descending
            val sortedDays = state.monthBreaksByDay.keys.sortedDescending()
            sortedDays.forEach { dateString ->
                val dayRecords = state.monthBreaksByDay[dateString] ?: emptyList()
                val dayTotalSeconds = dayRecords.sumOf { it.durationSeconds }

                item(key = "day_$dateString") {
                    DayHistoryCard(
                        dateString = dateString,
                        totalSeconds = dayTotalSeconds,
                        records = dayRecords,
                        onDeleteBreak = onDeleteBreak
                    )
                }
            }
        }
    }
}

@Composable
fun MonthSelectorCard(
    yearMonth: String,
    onPreviousMonth: () -> Unit,
    onNextMonth: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(
                onClick = onPreviousMonth,
                modifier = Modifier.testTag("btn_prev_month")
            ) {
                Icon(
                    imageVector = Icons.Default.ChevronLeft,
                    contentDescription = "Poprzedni miesiąc",
                    tint = MaterialTheme.colorScheme.primary
                )
            }

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = formatMonthName(yearMonth),
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "Przegląd przerw w pracy",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            IconButton(
                onClick = onNextMonth,
                modifier = Modifier.testTag("btn_next_month")
            ) {
                Icon(
                    imageVector = Icons.Default.ChevronRight,
                    contentDescription = "Następny miesiąc",
                    tint = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}

@Composable
fun MonthlySummaryCard(
    totalSeconds: Long,
    breaksCount: Int,
    activeDaysCount: Int
) {
    val avgPerDay = if (activeDaysCount > 0) totalSeconds / activeDaysCount else 0L

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155))
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.DateRange,
                    contentDescription = null,
                    tint = Color(0xFF38BDF8),
                    modifier = Modifier.size(20.dp)
                )
                Text(
                    text = "Statystyki z wybranego miesiąca",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                MetricColumn(
                    title = "Czas łącznie",
                    value = formatHoursMinutes(totalSeconds),
                    color = Color(0xFF10B981),
                    modifier = Modifier.weight(1f)
                )
                MetricColumn(
                    title = "Liczba przerw",
                    value = "$breaksCount",
                    color = Color(0xFFF59E0B),
                    modifier = Modifier.weight(1f)
                )
                MetricColumn(
                    title = "Dni robocze",
                    value = "$activeDaysCount",
                    color = Color(0xFF38BDF8),
                    modifier = Modifier.weight(1f)
                )
                MetricColumn(
                    title = "Średnia / dzień",
                    value = formatMinutesSeconds(avgPerDay),
                    color = Color(0xFFA78BFA),
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
fun MetricColumn(
    title: String,
    value: String,
    color: Color,
    modifier: Modifier = Modifier
) {
    Surface(
        color = Color(0xFF0F172A),
        shape = RoundedCornerShape(10.dp),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier.padding(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = title,
                fontSize = 10.sp,
                color = Color(0xFF94A3B8),
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = value,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = color,
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
fun MonthlyResetSettingsCard(
    autoResetEnabled: Boolean,
    onToggleAutoReset: (Boolean) -> Unit,
    onClearCurrentMonth: () -> Unit,
    onClearAll: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(18.dp)
                        )
                        Text(
                            text = "Reset historii raz w miesiącu",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                    Text(
                        text = "Automatycznie czyści poprzedni miesiąc po rozpoczęciu nowego miesiąca roboczego.",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Switch(
                    checked = autoResetEnabled,
                    onCheckedChange = onToggleAutoReset,
                    modifier = Modifier.testTag("switch_auto_monthly_reset"),
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = MaterialTheme.colorScheme.primary,
                        checkedTrackColor = MaterialTheme.colorScheme.primaryContainer
                    )
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedButton(
                    onClick = onClearCurrentMonth,
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier
                        .weight(1f)
                        .testTag("btn_clear_month")
                ) {
                    Icon(
                        imageVector = Icons.Default.DeleteSweep,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.error,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Wyczyść ten miesiąc", fontSize = 11.sp, color = MaterialTheme.colorScheme.error)
                }

                TextButton(
                    onClick = onClearAll,
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Text("Usuń wszystko", fontSize = 11.sp, color = MaterialTheme.colorScheme.error)
                }
            }
        }
    }
}

@Composable
fun DayHistoryCard(
    dateString: String,
    totalSeconds: Long,
    records: List<BreakRecord>,
    onDeleteBreak: (BreakRecord) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Day Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = formatReadableDate(dateString),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Surface(
                    color = Color(0xFF0F172A),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(
                        text = "Łącznie: ${formatMinutesSeconds(totalSeconds)}",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFF10B981),
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
            }

            // Individual breaks in this day
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                records.forEachIndexed { idx, record ->
                    val timeFmt = remember { SimpleDateFormat("HH:mm:ss", Locale.getDefault()) }
                    val startStr = timeFmt.format(Date(record.startTimeMs))
                    val endStr = timeFmt.format(Date(record.endTimeMs))

                    Surface(
                        color = MaterialTheme.colorScheme.surface,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 10.dp, vertical = 6.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text(
                                    text = "#${records.size - idx}",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.primary
                                )
                                Text(
                                    text = "$startStr - $endStr",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                            }

                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text(
                                    text = formatMinutesSeconds(record.durationSeconds),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFFF59E0B)
                                )
                                IconButton(
                                    onClick = { onDeleteBreak(record) },
                                    modifier = Modifier.size(24.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Delete,
                                        contentDescription = "Usuń",
                                        tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AutoResetDialog(
    currentHour: Int,
    currentMinute: Int,
    onSave: (Int, Int) -> Unit,
    onDismiss: () -> Unit
) {
    var selectedHour by remember { mutableIntStateOf(currentHour) }
    var selectedMinute by remember { mutableIntStateOf(currentMinute) }

    val presetShifts = listOf(
        Triple(6, 0, "06:00 (Zmiana poranna)"),
        Triple(7, 0, "07:00 (Standard 7:00)"),
        Triple(8, 0, "08:00 (Standard 8:00)"),
        Triple(14, 0, "14:00 (Zmiana popołudniowa)"),
        Triple(22, 0, "22:00 (Zmiana nocna)"),
        Triple(0, 0, "00:00 (Północ)")
    )

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(Icons.Default.Schedule, null, tint = MaterialTheme.colorScheme.primary)
                Text("Godzina resetu limitu")
            }
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "O wybranej godzinie każdego dnia limit 30 minut odnowi się automatycznie, a widget rozpocznie świeży dzień roboczy.",
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                // Interactive Hour and Minute Stepper
                Surface(
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceEvenly,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Hour Selector
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Godzina", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(modifier = Modifier.height(4.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                IconButton(
                                    onClick = { selectedHour = if (selectedHour == 0) 23 else selectedHour - 1 },
                                    modifier = Modifier.size(32.dp)
                                ) {
                                    Icon(Icons.Default.Remove, null, modifier = Modifier.size(18.dp))
                                }
                                Text(
                                    text = String.format("%02d", selectedHour),
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 8.dp)
                                )
                                IconButton(
                                    onClick = { selectedHour = (selectedHour + 1) % 24 },
                                    modifier = Modifier.size(32.dp)
                                ) {
                                    Icon(Icons.Default.Add, null, modifier = Modifier.size(18.dp))
                                }
                            }
                        }

                        Text(":", fontSize = 28.sp, fontWeight = FontWeight.Bold)

                        // Minute Selector
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Minuta", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(modifier = Modifier.height(4.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                IconButton(
                                    onClick = { selectedMinute = if (selectedMinute == 0) 55 else (selectedMinute - 5).coerceAtLeast(0) },
                                    modifier = Modifier.size(32.dp)
                                ) {
                                    Icon(Icons.Default.Remove, null, modifier = Modifier.size(18.dp))
                                }
                                Text(
                                    text = String.format("%02d", selectedMinute),
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 8.dp)
                                )
                                IconButton(
                                    onClick = { selectedMinute = (selectedMinute + 5) % 60 },
                                    modifier = Modifier.size(32.dp)
                                ) {
                                    Icon(Icons.Default.Add, null, modifier = Modifier.size(18.dp))
                                }
                            }
                        }
                    }
                }

                Text(
                    text = "Szybki wybór zmiany roboczej:",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold
                )

                // Presets list
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    presetShifts.forEach { (h, m, label) ->
                        val isSelected = selectedHour == h && selectedMinute == m
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .clickable {
                                    selectedHour = h
                                    selectedMinute = m
                                },
                            color = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 10.dp, vertical = 8.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = label,
                                    fontSize = 12.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                    color = if (isSelected) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface
                                )
                                if (isSelected) {
                                    Icon(
                                        Icons.Default.CheckCircle,
                                        null,
                                        tint = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onSave(selectedHour, selectedMinute) },
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
            ) {
                Text("Zapisz godzinę")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Anuluj")
            }
        }
    )
}

@Composable
fun StatusPill(isOnBreak: Boolean) {
    val pillBg = if (isOnBreak) Color(0xFF78350F) else Color(0xFF064E3B)
    val pillBorder = if (isOnBreak) Color(0xFFF59E0B) else Color(0xFF10B981)
    val textColor = if (isOnBreak) Color(0xFFFDE68A) else Color(0xFF6EE7B7)
    val label = if (isOnBreak) "☕ JESTEŚ NA PRZERWIE" else "💼 OBECNIE W PRACY"

    Surface(
        color = pillBg,
        shape = RoundedCornerShape(24.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, pillBorder)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(pillBorder)
            )
            Text(
                text = label,
                color = textColor,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
fun AlarmBannerCard(
    isTesting: Boolean,
    is3MinWarning: Boolean,
    isLimitExceeded: Boolean,
    onStopAlarm: () -> Unit
) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val alphaAnim by infiniteTransition.animateFloat(
        initialValue = 0.85f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(600, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "alarmAlpha"
    )

    val title = when {
        isTesting -> "🔊 Test dźwięku alarmu"
        isLimitExceeded -> "🚨 LIMIT 30 MINUT PRZEKROCZONY!"
        is3MinWarning -> "⏰ UWAGA! Zostały tylko 3 minuty przerwy!"
        else -> "⏰ ALARM KOŃCA PRZERWY!"
    }

    val subtitle = when {
        isTesting -> "Sprawdź głośność i wibracje na telefonie."
        isLimitExceeded -> "Twój dzienny limit przerwy został całkowicie wykorzystany. Czas wrócić do pracy!"
        is3MinWarning -> "Kończy Ci się przerwa. Przygotuj się do powrotu do pracy i odbicia!"
        else -> "Przerwa dobiega końca."
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .scale(alphaAnim)
            .testTag("alarm_banner"),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF7F1D1D)),
        border = androidx.compose.foundation.BorderStroke(2.dp, Color(0xFFEF4444))
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.NotificationsActive,
                    contentDescription = null,
                    tint = Color(0xFFFECACA),
                    modifier = Modifier.size(28.dp)
                )
                Text(
                    text = title,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    textAlign = TextAlign.Center
                )
            }
            Text(
                text = subtitle,
                color = Color(0xFFFECACA),
                fontSize = 13.sp,
                textAlign = TextAlign.Center
            )
            Button(
                onClick = onStopAlarm,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("btn_stop_alarm")
            ) {
                Icon(Icons.Default.NotificationsOff, null, tint = Color.White)
                Spacer(modifier = Modifier.width(8.dp))
                Text("WYŁĄCZ ALARM", color = Color.White, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun BreakGaugeView(
    remainingSeconds: Long,
    totalUsedSeconds: Long,
    limitMinutes: Int,
    remainingFraction: Float,
    isOnBreak: Boolean,
    activeElapsed: Long
) {
    val progressColor = when {
        remainingSeconds <= 0 -> Color(0xFFEF4444)
        remainingSeconds <= 180 -> Color(0xFFF59E0B)
        else -> Color(0xFF10B981)
    }

    Box(
        modifier = Modifier
            .size(240.dp)
            .padding(8.dp),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val strokeWidth = 16.dp.toPx()
            // Track background
            drawCircle(
                color = Color(0xFF1E293B),
                style = Stroke(width = strokeWidth)
            )
            // Progress arc
            val sweep = remainingFraction * 360f
            drawArc(
                color = progressColor,
                startAngle = -90f,
                sweepAngle = sweep,
                useCenter = false,
                style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
            )
        }

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = "POZOSTAŁO",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                letterSpacing = 2.sp,
                fontSize = 11.sp
            )
            Spacer(modifier = Modifier.height(4.dp))
            val displayTime = if (remainingSeconds >= 0) {
                formatMinutesSeconds(remainingSeconds)
            } else {
                "-" + formatMinutesSeconds(-remainingSeconds)
            }
            Text(
                text = displayTime,
                style = MaterialTheme.typography.displayMedium,
                fontWeight = FontWeight.ExtraBold,
                color = if (remainingSeconds <= 180) progressColor else MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.testTag("text_remaining_time")
            )
            Text(
                text = "z limitu ${limitMinutes} min",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            if (isOnBreak) {
                Spacer(modifier = Modifier.height(8.dp))
                Surface(
                    color = Color(0xFF78350F),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(
                        text = "Trwa: ${formatMinutesSeconds(activeElapsed)}",
                        color = Color(0xFFFDE68A),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun BigPunchButton(
    isOnBreak: Boolean,
    activeElapsedSeconds: Long,
    onClick: () -> Unit
) {
    val bgColor = if (isOnBreak) Color(0xFFDC2626) else Color(0xFF10B981)
    val buttonText = if (isOnBreak) "ZAKOŃCZ PRZERWĘ (POWRÓT)" else "WYJDŹ NA PRZERWĘ (START)"
    val subText = if (isOnBreak) "Bieżąca przerwa: ${formatMinutesSeconds(activeElapsedSeconds)}" else "Kliknij, aby zacząć odliczać czas"

    Button(
        onClick = onClick,
        colors = ButtonDefaults.buttonColors(containerColor = bgColor),
        shape = RoundedCornerShape(20.dp),
        modifier = Modifier
            .fillMaxWidth()
            .height(72.dp)
            .testTag("btn_toggle_break")
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = if (isOnBreak) Icons.Default.CheckCircle else Icons.Default.FreeBreakfast,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(32.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = buttonText,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    text = subText,
                    fontSize = 12.sp,
                    color = Color.White.copy(alpha = 0.85f)
                )
            }
        }
    }
}

@Composable
fun SummaryMetricsRow(
    remainingSeconds: Long,
    usedSeconds: Long,
    breaksCount: Int
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        MetricCard(
            title = "Pozostało",
            value = formatMinutesSeconds(remainingSeconds.coerceAtLeast(0)),
            icon = Icons.Default.AccessTime,
            accentColor = Color(0xFF10B981),
            modifier = Modifier.weight(1f)
        )
        MetricCard(
            title = "Użyto",
            value = formatMinutesSeconds(usedSeconds),
            icon = Icons.Default.History,
            accentColor = Color(0xFFF59E0B),
            modifier = Modifier.weight(1f)
        )
        MetricCard(
            title = "Przerwy",
            value = "$breaksCount",
            icon = Icons.Default.FreeBreakfast,
            accentColor = Color(0xFF38BDF8),
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
fun MetricCard(
    title: String,
    value: String,
    icon: ImageVector,
    accentColor: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = accentColor,
                    modifier = Modifier.size(16.dp)
                )
                Text(
                    text = title,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Text(
                text = value,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
        }
    }
}

@Composable
fun WidgetHintCard(
    onOpenDialog: () -> Unit,
    onDirectPin: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155))
    ) {
        Row(
            modifier = Modifier
                .padding(14.dp)
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Widgets,
                contentDescription = null,
                tint = Color(0xFF38BDF8),
                modifier = Modifier.size(28.dp)
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Widget na ekran główny",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = Color.White
                )
                Text(
                    text = "Odbijaj się 1 kliknięciem prosto z pulpitu telefonu bez otwierania aplikacji!",
                    fontSize = 12.sp,
                    color = Color(0xFF94A3B8)
                )
            }
            Button(
                onClick = onDirectPin,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
                shape = RoundedCornerShape(10.dp)
            ) {
                Text("Dodaj", fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun BreakItemCard(
    index: Int,
    record: BreakRecord,
    onDelete: () -> Unit
) {
    val timeFormatter = remember { SimpleDateFormat("HH:mm:ss", Locale.getDefault()) }
    val startTime = timeFormatter.format(Date(record.startTimeMs))
    val endTime = timeFormatter.format(Date(record.endTimeMs))

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Surface(
                    shape = CircleShape,
                    color = Color(0xFF0F172A),
                    modifier = Modifier.size(36.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            text = "#$index",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
                Column {
                    Text(
                        text = "$startTime - $endTime",
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "Czas trwania: ${formatMinutesSeconds(record.durationSeconds)}",
                        fontSize = 12.sp,
                        color = Color(0xFFF59E0B),
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            IconButton(
                onClick = onDelete,
                modifier = Modifier.size(36.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Delete,
                    contentDescription = "Usuń wpis",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}

@Composable
fun EmptyBreaksCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(
                imageVector = Icons.Default.FreeBreakfast,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(40.dp)
            )
            Text(
                text = "Brak zarejestrowanych przerw dzisiaj",
                fontWeight = FontWeight.SemiBold,
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = "Gdy wychodzisz na przerwę, kliknij zielony przycisk powyżej lub użyj widgetu na ekranie głównym.",
                fontSize = 12.sp,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
fun LimitSelectionDialog(
    currentLimit: Int,
    onSelectLimit: (Int) -> Unit,
    onDismiss: () -> Unit
) {
    val options = listOf(15, 20, 25, 30, 45, 60)

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Wybierz dzienny limit przerwy") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "Domyślny limit to 30 minut. Alarm włączy się, gdy do wybranego limitu zostaną 3 minuty.",
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(4.dp))
                options.forEach { minutes ->
                    val isSelected = minutes == currentLimit
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .clickable { onSelectLimit(minutes) },
                        color = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "$minutes minut",
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                color = if (isSelected) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface
                            )
                            if (isSelected) {
                                Icon(
                                    Icons.Default.CheckCircle,
                                    null,
                                    tint = MaterialTheme.colorScheme.primary
                                )
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Zamknij")
            }
        }
    )
}

@Composable
fun WidgetInfoDialog(
    onPinWidget: () -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(Icons.Default.Widgets, null, tint = Color(0xFF38BDF8))
                Text("Widget na ekranie głównym")
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = "Widget pozwala odbijać wejście i wyjście oraz sprawdzać pozostały czas bez otwierania aplikacji:",
                    fontSize = 13.sp
                )
                Text(
                    text = "1. Dotknij i przytrzymaj puste miejsce na ekranie głównym (pulpicie).\n2. Wybierz 'Widgety' z menu.\n3. Odszukaj 'Czas Przerwy'.\n4. Przeciągnij widget na swój ekran.",
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = "Możesz też spróbować dodać go automatycznie klikając przycisk poniżej:",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        },
        confirmButton = {
            Button(
                onClick = onPinWidget,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7))
            ) {
                Text("Dodaj automatycznie")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Zamknij")
            }
        }
    )
}

fun formatMinutesSeconds(seconds: Long): String {
    val s = seconds.coerceAtLeast(0)
    val m = s / 60
    val sec = s % 60
    return String.format("%02d:%02d", m, sec)
}

fun formatHoursMinutes(seconds: Long): String {
    val s = seconds.coerceAtLeast(0)
    val h = s / 3600
    val m = (s % 3600) / 60
    return if (h > 0) "${h}h ${m}m" else "${m} min"
}

fun formatMonthName(yearMonth: String): String {
    val sdf = SimpleDateFormat("yyyy-MM", Locale.getDefault())
    return try {
        val date = sdf.parse(yearMonth) ?: Date()
        val outSdf = SimpleDateFormat("LLLL yyyy", Locale("pl", "PL"))
        val formatted = outSdf.format(date)
        formatted.replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale("pl", "PL")) else it.toString() }
    } catch (e: Exception) {
        yearMonth
    }
}

fun formatReadableDate(dateString: String): String {
    val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
    return try {
        val date = sdf.parse(dateString) ?: Date()
        val outSdf = SimpleDateFormat("EEEE, d MMMM yyyy", Locale("pl", "PL"))
        val formatted = outSdf.format(date)
        formatted.replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale("pl", "PL")) else it.toString() }
    } catch (e: Exception) {
        dateString
    }
}

fun breaksCountLabel(count: Int): String {
    return when {
        count == 1 -> "odbicie"
        count in 2..4 -> "odbicia"
        else -> "odbić"
    }
}
