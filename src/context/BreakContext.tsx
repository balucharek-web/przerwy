import React, { createContext, useContext, useEffect, useRef, useState, useMemo } from 'react';
import { BreakRecord, UserSettings, WebhookLog, DayBreakSummary } from '../types';
import { getDayKey } from '../utils/dateUtils';
import { 
  playWarningAlarm, 
  playLimitReachedAlarm, 
  playToggleFeedback, 
  sendSystemNotification,
  startBackgroundKeepAlive,
  stopBackgroundKeepAlive
} from '../utils/audioAlert';
import { sendGoogleChatWebhook, flushOfflineWebhookQueue } from '../utils/googleChatService';
import { 
  updateSystemNotificationBar, 
  clearSystemNotificationBar, 
  getControlChannel, 
  requestNotificationPermission,
  bindMediaSessionHandlers
} from '../utils/notificationControl';
import {
  triggerHaptic,
  triggerSystemVibration,
  setVibrationIntensity,
  getButtonPattern,
  getTickPattern,
  getWarningPattern,
  getLimitReachedPattern,
  triggerScreenLockConfirmation,
  triggerCountdownTick,
  triggerWarningVibration,
  triggerLimitReachedVibration,
  isVibrationSupported,
  isScreenLockedOrHidden,
} from '../utils/vibrationService';
import { requestScreenWakeLock, releaseScreenWakeLock } from '../utils/wakeLockService';
import {
  backupToIndexedDB,
  restoreFromIndexedDB,
  ensurePersistentStorage,
} from '../utils/persistenceService';

interface BreakContextType {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  breaks: BreakRecord[];
  activeBreak: BreakRecord | null;
  currentBreakSeconds: number;
  todaySummary: DayBreakSummary;
  webhookLogs: WebhookLog[];
  startBreak: (note?: string) => Promise<void>;
  stopBreak: (note?: string, subtractMinutes?: number) => Promise<void>;
  deleteBreak: (id: string) => void;
  updateBreak: (id: string, updates: Partial<BreakRecord>) => void;
  addManualBreak: (record: { startTime: string; endTime: string; note?: string }) => void;
  clearTodayBreaks: () => void;
  clearAllHistory: () => void;
  testWebhook: () => Promise<WebhookLog>;
  testSoundAlarm: (type: 'warning' | 'final', volume?: number) => void;
  testVibration: (type?: 'tick' | 'warning' | 'lock' | 'strong') => boolean;
  lastWebhookStatus: { status: 'idle' | 'sending' | 'success' | 'error'; message: string };
  exportDataJSON: () => string;
  importDataJSON: (jsonStr: string) => boolean;
  fastForwardSeconds: (seconds: number) => void;
  jumpToAlarmTest: (mode: 'warning' | 'limit') => void;
  undoState: { type: 'start' | 'stop'; label: string; timestamp: number } | null;
  undoLastAction: () => void;
  dismissUndo: () => void;
  powerOffWarning: { breakId: string; elapsedMinutes: number; startTime: string } | null;
  resolvePowerOffBreak: (resolution: 'cap_allowance' | 'keep_running' | 'discard') => void;
}

import { updateAppBadge, clearAppBadge } from '../utils/badgeService';

export const TEAM_SHARED_WEBHOOK = 'https://chat.googleapis.com/v1/spaces/AAAA94ZyILs/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=aoQFsSDKoYcofsyF4Cd1cynnTkNShzZDilpkNcJ4j2c';

const DEFAULT_SETTINGS: UserSettings = {
  dailyAllowanceMinutes: 30,
  warningMinutesBeforeEnd: 3,
  resetHour: '00:00',
  googleChatWebhookUrl: TEAM_SHARED_WEBHOOK,
  googleChatUserName: 'Pracownik',
  soundAlertsEnabled: true,
  alarmVolume: 80,
  browserNotificationsEnabled: true,
  vibrateEnabled: true,
  vibrationIntensity: 'turbo',
  countdownVibrationEnabled: true,
  vibrateOnlyWhenScreenLocked: true,
  countdownVibrationIntervalMinutes: 1,
  simpleChatMessages: true,
  startMessageText: 'start',
  stopMessageText: 'stop',
  notificationBarControlsEnabled: true,
  notificationBarOnlyDuringBreak: true,
  includeNameInSimpleMessage: true,
  keepScreenAwakeDuringBreak: false,
  pocketLockEnabled: false,
  appBadgeEnabled: true,
};

const BreakContext = createContext<BreakContextType | undefined>(undefined);

const SETTINGS_STORAGE_KEY = 'przerwapro_settings';
const RECORDS_STORAGE_KEY = 'przerwapro_records';
const ACTIVE_BREAK_KEY = 'przerwapro_active_break';
const WEBHOOK_LOGS_KEY = 'przerwapro_webhook_logs';

export const BreakProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Settings state
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.googleChatWebhookUrl) {
          parsed.googleChatWebhookUrl = TEAM_SHARED_WEBHOOK;
          parsed.includeNameInSimpleMessage = true;
        }
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
      return DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // History break records (with auto-deduplication to self-heal any previous duplicate entries)
  const [breaks, setBreaks] = useState<BreakRecord[]>(() => {
    try {
      const saved = localStorage.getItem(RECORDS_STORAGE_KEY);
      const parsed: BreakRecord[] = saved ? JSON.parse(saved) : [];
      // Clean up any exact duplicate records (same id or same startTime and endTime)
      return parsed.filter(
        (b, idx, arr) => arr.findIndex((x) => x.id === b.id || (x.startTime === b.startTime && x.endTime === b.endTime)) === idx
      );
    } catch {
      return [];
    }
  });

  // Currently ongoing active break
  const [activeBreak, setActiveBreak] = useState<BreakRecord | null>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_BREAK_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Webhook event logs
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>(() => {
    try {
      const saved = localStorage.getItem(WEBHOOK_LOGS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [lastWebhookStatus, setLastWebhookStatus] = useState<{
    status: 'idle' | 'sending' | 'success' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });

  // Running second counter for active break
  const [currentBreakSeconds, setCurrentBreakSeconds] = useState<number>(0);

  // Undo state for accidental Start / Stop clicks
  const [undoState, setUndoState] = useState<{
    type: 'start' | 'stop';
    label: string;
    timestamp: number;
    payload?: any;
  } | null>(null);
  const undoTimeoutRef = useRef<any>(null);
  const isStartingRef = useRef<boolean>(false);
  const isStoppingRef = useRef<boolean>(false);

  // Power-off / Crash detection for active break upon app launch
  const [powerOffWarning, setPowerOffWarning] = useState<{
    breakId: string;
    elapsedMinutes: number;
    startTime: string;
  } | null>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_BREAK_KEY);
      if (!saved) return null;
      const b: BreakRecord = JSON.parse(saved);
      if (!b || !b.startTime) return null;
      const elapsed = Math.floor((Date.now() - new Date(b.startTime).getTime()) / 1000);
      // If active break has been running for > 50 minutes upon startup (typical after power off / reboot)
      if (elapsed > 50 * 60) {
        return {
          breakId: b.id,
          elapsedMinutes: Math.floor(elapsed / 60),
          startTime: b.startTime,
        };
      }
      return null;
    } catch {
      return null;
    }
  });

  const resolvePowerOffBreak = (resolution: 'cap_allowance' | 'keep_running' | 'discard') => {
    if (!activeBreak) {
      setPowerOffWarning(null);
      return;
    }

    if (resolution === 'cap_allowance') {
      const start = new Date(activeBreak.startTime);
      const end = new Date(start.getTime() + settings.dailyAllowanceMinutes * 60 * 1000);
      const finishedBreak: BreakRecord = {
        ...activeBreak,
        endTime: end.toISOString(),
        durationSeconds: settings.dailyAllowanceMinutes * 60,
        note: activeBreak.note ? `${activeBreak.note} (Skorygowano po restarcie)` : 'Skorygowano po restarcie telefonu',
      };
      setBreaks((prev) => [finishedBreak, ...prev.filter((b) => b.id !== finishedBreak.id)]);
      setActiveBreak(null);
      clearSystemNotificationBar();
      stopBackgroundKeepAlive();
    } else if (resolution === 'discard') {
      setActiveBreak(null);
      clearSystemNotificationBar();
      stopBackgroundKeepAlive();
    }
    setPowerOffWarning(null);
  };

  // Auto-flush offline webhook queue when connection is restored
  useEffect(() => {
    const handleOnline = async () => {
      const delivered = await flushOfflineWebhookQueue();
      if (delivered > 0) {
        setLastWebhookStatus({
          status: 'success',
          message: `✅ Dosłano ${delivered} zaległą wiadomość na Google Chat po powrocie do sieci!`,
        });
      }
    };

    window.addEventListener('online', handleOnline);
    handleOnline();

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Flags to avoid multiple alarms in the same break session
  const warningAlarmFiredRef = useRef<boolean>(false);
  const limitAlarmFiredRef = useRef<boolean>(false);
  const lastVibratedMinuteRef = useRef<number>(-1);

  // Save settings with dual-layer persistence (LocalStorage + IndexedDB)
  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      backupToIndexedDB('settings', updated);
      return updated;
    });
    if (newSettings.vibrationIntensity) {
      setVibrationIntensity(newSettings.vibrationIntensity);
    }
  };

  // Sync vibration intensity with vibration service
  useEffect(() => {
    setVibrationIntensity(settings.vibrationIntensity || 'turbo');
  }, [settings.vibrationIntensity]);

  // Save breaks with dual-layer persistence (LocalStorage + IndexedDB)
  useEffect(() => {
    try {
      localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(breaks));
    } catch {}
    if (breaks.length > 0) {
      backupToIndexedDB('breaks', breaks);
    }
  }, [breaks]);

  // Cross-tab synchronization and IndexedDB auto-recovery
  useEffect(() => {
    ensurePersistentStorage();

    // 1. Recover from IndexedDB if LocalStorage was wiped by Android storage cleaner
    const checkRecovery = async () => {
      const isDefaultUser = settings.googleChatUserName === 'Pracownik';
      const hasNoBreaks = breaks.length === 0;

      if (isDefaultUser || hasNoBreaks) {
        const [backupSettings, backupBreaks] = await Promise.all([
          restoreFromIndexedDB<UserSettings>('settings'),
          restoreFromIndexedDB<BreakRecord[]>('breaks'),
        ]);

        if (backupSettings && backupSettings.googleChatUserName && backupSettings.googleChatUserName !== 'Pracownik') {
          console.log('🔄 Przywrócono ustawienia użytkownika z trwałej bazy IndexedDB!');
          setSettings((prev) => {
            const merged = { ...prev, ...backupSettings };
            try {
              localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }

        if (backupBreaks && backupBreaks.length > 0 && breaks.length === 0) {
          console.log(`🔄 Przywrócono ${backupBreaks.length} przerw z trwałej bazy IndexedDB!`);
          setBreaks(backupBreaks);
          try {
            localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(backupBreaks));
          } catch {}
        }
      }
    };

    checkRecovery();

    // 2. Real-time sync across multiple open browser tabs / PWA windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SETTINGS_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setSettings((prev) => ({ ...prev, ...parsed }));
        } catch {}
      } else if (e.key === RECORDS_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setBreaks(parsed);
          }
        } catch {}
      } else if (e.key === ACTIVE_BREAK_KEY) {
        try {
          const parsed = e.newValue ? JSON.parse(e.newValue) : null;
          setActiveBreak(parsed);
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Save active break
  useEffect(() => {
    if (activeBreak) {
      localStorage.setItem(ACTIVE_BREAK_KEY, JSON.stringify(activeBreak));
      lastVibratedMinuteRef.current = -1;
    } else {
      localStorage.removeItem(ACTIVE_BREAK_KEY);
      warningAlarmFiredRef.current = false;
      limitAlarmFiredRef.current = false;
      lastVibratedMinuteRef.current = -1;
      setCurrentBreakSeconds(0);
      clearAppBadge();
    }
  }, [activeBreak]);

  // Ensure Chrome never displays duplicate media player widget
  useEffect(() => {
    bindMediaSessionHandlers();
  }, []);

  // Save logs
  useEffect(() => {
    localStorage.setItem(WEBHOOK_LOGS_KEY, JSON.stringify(webhookLogs.slice(0, 50)));
  }, [webhookLogs]);

  const addWebhookLog = (log: WebhookLog) => {
    setWebhookLogs((prev) => [log, ...prev].slice(0, 50));
    setLastWebhookStatus({
      status: log.status,
      message: log.message,
    });
  };

  // Timer interval for active break with Web Worker & background keep-alive
  useEffect(() => {
    if (!activeBreak) {
      stopBackgroundKeepAlive();
      releaseScreenWakeLock();
      return;
    }

    // Keep background audio active on mobile devices
    startBackgroundKeepAlive();

    if (settings.keepScreenAwakeDuringBreak) {
      requestScreenWakeLock();
    }

    const updateTimer = () => {
      const startMs = new Date(activeBreak.startTime).getTime();
      const nowMs = Date.now();
      const elapsed = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      setCurrentBreakSeconds(elapsed);

      // Pocket vibration during countdown:
      // Vibrates periodically (e.g. every 1 or 5 min), but ONLY when screen is locked/hidden if configured
      if (settings.vibrateEnabled !== false && settings.countdownVibrationEnabled !== false) {
        const isLocked = isScreenLockedOrHidden();
        const canVibrate = settings.vibrateOnlyWhenScreenLocked ? isLocked : true;
        if (canVibrate) {
          const elapsedMinutes = Math.floor(elapsed / 60);
          const interval = Math.max(1, settings.countdownVibrationIntervalMinutes || 1);
          if (
            elapsedMinutes > 0 &&
            elapsedMinutes % interval === 0 &&
            elapsed % 60 === 0 &&
            lastVibratedMinuteRef.current !== elapsedMinutes
          ) {
            lastVibratedMinuteRef.current = elapsedMinutes;
            triggerCountdownTick(elapsedMinutes);
          }
        }
      }
    };

    updateTimer();

    // Listen to visibilitychange so returning to the app immediately recalculates exact seconds
    // and locking the phone provides instant confirmation vibration
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateTimer();
        if (settings.keepScreenAwakeDuringBreak) {
          requestScreenWakeLock();
        }
      } else if (document.visibilityState === 'hidden' && activeBreak) {
        // Screen was just locked during an active break
        if (settings.vibrateEnabled !== false && settings.countdownVibrationEnabled !== false) {
          triggerScreenLockConfirmation();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    let worker: Worker | null = null;
    let fallbackInterval: any = null;

    try {
      const workerCode = `
        let timer = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (timer) clearInterval(timer);
            timer = setInterval(function() {
              self.postMessage('tick');
            }, 1000);
          } else if (e.data === 'stop') {
            if (timer) {
              clearInterval(timer);
              timer = null;
            }
          }
        };
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      worker = new Worker(workerUrl);

      worker.onmessage = () => {
        updateTimer();
      };
      worker.postMessage('start');

      // Also standard interval
      fallbackInterval = setInterval(updateTimer, 1000);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        releaseScreenWakeLock();
        if (worker) {
          worker.postMessage('stop');
          worker.terminate();
          URL.revokeObjectURL(workerUrl);
        }
        if (fallbackInterval) {
          clearInterval(fallbackInterval);
        }
      };
    } catch (e) {
      fallbackInterval = setInterval(updateTimer, 1000);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        releaseScreenWakeLock();
        clearInterval(fallbackInterval);
      };
    }
  }, [activeBreak, settings.keepScreenAwakeDuringBreak]);

  // Current day key based on resetHour with active timer and visibility change listener
  const [currentDayKey, setCurrentDayKey] = useState<string>(() => getDayKey(new Date(), settings.resetHour));

  useEffect(() => {
    const checkDay = () => {
      const key = getDayKey(new Date(), settings.resetHour);
      setCurrentDayKey((prev) => (prev !== key ? key : prev));
    };

    checkDay();
    const interval = setInterval(checkDay, 10000); // Check every 10 seconds
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkDay();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [settings.resetHour]);

  // Breaks completed today (resiliently matches both b.dayKey and actual b.startTime against currentDayKey)
  const todayCompletedBreaks = useMemo(() => {
    return breaks.filter((b) => {
      if (b.dayKey === currentDayKey) return true;
      if (b.startTime) {
        try {
          return getDayKey(new Date(b.startTime), settings.resetHour) === currentDayKey;
        } catch {}
      }
      return false;
    });
  }, [breaks, currentDayKey, settings.resetHour]);

  const todayCompletedSeconds = useMemo(() => {
    return todayCompletedBreaks.reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0);
  }, [todayCompletedBreaks]);

  // Total seconds used today (completed + current ongoing)
  const totalUsedSecondsToday = todayCompletedSeconds + (activeBreak ? currentBreakSeconds : 0);
  const allowanceSeconds = settings.dailyAllowanceMinutes * 60;
  const remainingSeconds = allowanceSeconds - totalUsedSecondsToday;

  const todaySummary: DayBreakSummary = useMemo(() => {
    return {
      dayKey: currentDayKey,
      date: new Date(),
      breaks: todayCompletedBreaks,
      totalSeconds: totalUsedSecondsToday,
      allowanceSeconds,
      isOverLimit: remainingSeconds < 0,
      remainingSeconds,
    };
  }, [currentDayKey, todayCompletedBreaks, totalUsedSecondsToday, allowanceSeconds, remainingSeconds]);

  // Keep App Badge synchronized with remaining minutes on phone home screen icon
  useEffect(() => {
    if (settings.appBadgeEnabled !== false && activeBreak) {
      const remainingMinutes = Math.max(0, Math.ceil(todaySummary.remainingSeconds / 60));
      updateAppBadge(remainingMinutes);
    } else {
      clearAppBadge();
    }
  }, [activeBreak, todaySummary.remainingSeconds, settings.appBadgeEnabled]);

  // Sound & Vibration Alarm Monitor: Checks 3 min warning and limit reached
  useEffect(() => {
    if (!activeBreak) return;

    const warningThresholdSeconds = settings.warningMinutesBeforeEnd * 60;

    // 1. Check warning alarm (e.g. 3 minutes remaining)
    if (
      remainingSeconds <= warningThresholdSeconds &&
      remainingSeconds > 0 &&
      !warningAlarmFiredRef.current
    ) {
      warningAlarmFiredRef.current = true;
      if (settings.soundAlertsEnabled) {
        playWarningAlarm(settings.alarmVolume ?? 80);
      }
      if (settings.vibrateEnabled !== false) {
        triggerWarningVibration();
      }

      if (settings.browserNotificationsEnabled) {
        sendSystemNotification('⚠️ Zbliża się koniec przerwy!', {
          body: `Zostały tylko ${settings.warningMinutesBeforeEnd} minuty z limitu (${settings.dailyAllowanceMinutes} min). Czas wracać!`,
          tag: 'break-warning',
          renotify: true,
          vibrate: [400, 150, 400, 150, 600],
          requireInteraction: true,
        });
      }
    }

    // 2. Check 0 min limit alarm
    if (remainingSeconds <= 0 && !limitAlarmFiredRef.current) {
      limitAlarmFiredRef.current = true;
      if (settings.soundAlertsEnabled) {
        playLimitReachedAlarm(settings.alarmVolume ?? 80);
      }
      if (settings.vibrateEnabled !== false) {
        triggerLimitReachedVibration();
      }

      if (settings.browserNotificationsEnabled) {
        sendSystemNotification('⏰ Limit przerwy wykorzystany!', {
          body: `Twój limit ${settings.dailyAllowanceMinutes} minut na dzisiaj właśnie się skończył. Wracaj do pracy!`,
          tag: 'break-limit',
          renotify: true,
          vibrate: [1000, 300, 1000, 300, 1500],
          requireInteraction: true,
        });
      }
    }
  }, [activeBreak, remainingSeconds, settings]);

  // START BREAK
  const startBreak = async (note?: string) => {
    if (isStartingRef.current || activeBreak) return;
    isStartingRef.current = true;
    setTimeout(() => {
      isStartingRef.current = false;
    }, 1200);

    const now = new Date();
    const dayKey = getDayKey(now, settings.resetHour);

    const newBreak: BreakRecord = {
      id: `brk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      startTime: now.toISOString(),
      endTime: null,
      durationSeconds: 0,
      note: note || '',
      dayKey,
    };

    warningAlarmFiredRef.current = false;
    limitAlarmFiredRef.current = false;
    setActiveBreak(newBreak);
    playToggleFeedback(true, settings.alarmVolume ?? 80);

    // Synchronously activate background audio within user click gesture
    startBackgroundKeepAlive();

    // Auto-request notifications if enabled and not yet decided
    if (settings.browserNotificationsEnabled) {
      requestNotificationPermission();
    }

    // Activate screen wake lock if enabled
    if (settings.keepScreenAwakeDuringBreak) {
      requestScreenWakeLock();
    }

    // Save undo state
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    setUndoState({
      type: 'start',
      label: 'Rozpoczęto przerwę',
      timestamp: Date.now(),
      payload: { breakId: newBreak.id },
    });
    undoTimeoutRef.current = setTimeout(() => {
      setUndoState(null);
    }, 8000);

    // Schedule server-side Web Push alarm as safety net for aggressive Android background sleep


    if (settings.googleChatWebhookUrl) {
      setLastWebhookStatus({ status: 'sending', message: 'Wysyłanie na Google Chat...' });
      sendGoogleChatWebhook({
        webhookUrl: settings.googleChatWebhookUrl,
        userName: settings.googleChatUserName,
        action: 'start',
        totalUsedSecondsToday: todayCompletedSeconds,
        dailyAllowanceSeconds: allowanceSeconds,
        simpleChatMessages: settings.simpleChatMessages,
        startMessageText: settings.startMessageText,
        stopMessageText: settings.stopMessageText,
        includeNameInSimpleMessage: settings.includeNameInSimpleMessage,
      }).then((log) => addWebhookLog(log));
    }
  };

  const stopBreak = async (note?: string, subtractMinutes?: number) => {
    if (isStoppingRef.current || !activeBreak) return;
    isStoppingRef.current = true;
    setTimeout(() => {
      isStoppingRef.current = false;
    }, 1200);

    const now = new Date();
    const startMs = new Date(activeBreak.startTime).getTime();

    // Calculate adjusted end time if subtractMinutes is provided
    let endMs = now.getTime();
    if (subtractMinutes && subtractMinutes > 0) {
      endMs = Math.max(startMs + 1000, endMs - subtractMinutes * 60 * 1000);
    }
    const duration = Math.max(1, Math.round((endMs - startMs) / 1000));
    const endDate = new Date(endMs);

    let finalNote = note !== undefined ? note : activeBreak.note;
    if (subtractMinutes && subtractMinutes > 0 && !note) {
      finalNote = activeBreak.note 
        ? `${activeBreak.note} (korekta -${subtractMinutes} min)`
        : `Korekta -${subtractMinutes} min`;
    }

    const completed: BreakRecord = {
      ...activeBreak,
      endTime: endDate.toISOString(),
      durationSeconds: duration,
      note: finalNote,
    };

    setBreaks((prev) => {
      // Prevent duplicate saving
      if (prev.some((b) => b.id === completed.id || (b.startTime === completed.startTime && b.endTime === completed.endTime))) {
        return prev;
      }
      return [completed, ...prev];
    });
    setActiveBreak(null);
    releaseScreenWakeLock();
    clearSystemNotificationBar();
    stopBackgroundKeepAlive();
    playToggleFeedback(false, settings.alarmVolume ?? 80);

    // Save undo state for stop
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    setUndoState({
      type: 'stop',
      label: 'Zakończono przerwę',
      timestamp: Date.now(),
      payload: { completedBreak: completed },
    });
    undoTimeoutRef.current = setTimeout(() => {
      setUndoState(null);
    }, 8000);

    const newTotalToday = todayCompletedSeconds + duration;

    if (settings.googleChatWebhookUrl) {
      setLastWebhookStatus({ status: 'sending', message: 'Wysyłanie na Google Chat...' });
      sendGoogleChatWebhook({
        webhookUrl: settings.googleChatWebhookUrl,
        userName: settings.googleChatUserName,
        action: 'stop',
        currentBreakDurationSeconds: duration,
        totalUsedSecondsToday: newTotalToday,
        dailyAllowanceSeconds: allowanceSeconds,
        simpleChatMessages: settings.simpleChatMessages,
        startMessageText: settings.startMessageText,
        stopMessageText: settings.stopMessageText,
        includeNameInSimpleMessage: settings.includeNameInSimpleMessage,
      }).then((log) => addWebhookLog(log));
    }
  };

  const dismissUndo = () => {
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    setUndoState(null);
  };

  const undoLastAction = () => {
    if (!undoState) return;
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);

    if (undoState.type === 'start') {
      setActiveBreak(null);
      clearSystemNotificationBar();
      stopBackgroundKeepAlive();
    } else if (undoState.type === 'stop') {
      const { completedBreak } = undoState.payload || {};
      if (completedBreak) {
        setBreaks((prev) => prev.filter((b) => b.id !== completedBreak.id));
        setActiveBreak({
          ...completedBreak,
          endTime: null,
        });
      }
    }
    setUndoState(null);
  };

  const deleteBreak = (id: string) => {
    setBreaks((prev) => prev.filter((b) => b.id !== id));
  };

  const updateBreak = (id: string, updates: Partial<BreakRecord>) => {
    setBreaks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
  };

  const addManualBreak = (record: { startTime: string; endTime: string; note?: string }) => {
    const start = new Date(record.startTime);
    const end = new Date(record.endTime);
    const duration = Math.max(1, Math.round((end.getTime() - start.getTime()) / 1000));
    const dayKey = getDayKey(start, settings.resetHour);

    const newBreak: BreakRecord = {
      id: `brk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      startTime: record.startTime,
      endTime: record.endTime,
      durationSeconds: duration,
      note: record.note || '',
      dayKey,
    };

    setBreaks((prev) => [newBreak, ...prev].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()));
  };

  const clearTodayBreaks = () => {
    setBreaks((prev) => prev.filter((b) => b.dayKey !== currentDayKey));
    if (activeBreak) {
      setActiveBreak(null);
    }
  };

  const clearAllHistory = () => {
    setBreaks([]);
    setActiveBreak(null);
    setWebhookLogs([]);
  };

  const testWebhook = async () => {
    setLastWebhookStatus({ status: 'sending', message: 'Testowanie połączenia...' });
    const log = await sendGoogleChatWebhook({
      webhookUrl: settings.googleChatWebhookUrl,
      userName: settings.googleChatUserName,
      action: 'test',
      totalUsedSecondsToday,
      dailyAllowanceSeconds: allowanceSeconds,
    });
    addWebhookLog(log);
    return log;
  };

  const testSoundAlarm = (type: 'warning' | 'final', volume?: number) => {
    const vol = volume !== undefined ? volume : (settings.alarmVolume ?? 80);
    if (type === 'warning') {
      playWarningAlarm(vol);
    } else {
      playLimitReachedAlarm(vol);
    }
  };

  const testVibration = (type: 'tick' | 'warning' | 'lock' | 'strong' = 'strong'): boolean => {
    if (type === 'tick') {
      triggerSystemVibration(getTickPattern(1));
      return true;
    } else if (type === 'lock') {
      triggerSystemVibration(getButtonPattern());
      return true;
    } else if (type === 'warning') {
      triggerSystemVibration(getWarningPattern());
      return true;
    } else {
      // Full power test vibration sequence (Turbo / Maximum)
      triggerSystemVibration(getWarningPattern());
      return true;
    }
  };

  const fastForwardSeconds = (sec: number) => {
    if (!activeBreak) {
      startBreak('Symulacja podglądu');
      setTimeout(() => {
        setActiveBreak((prev) => {
          if (!prev) return null;
          const currentStart = new Date(prev.startTime).getTime();
          return {
            ...prev,
            startTime: new Date(currentStart - sec * 1000).toISOString(),
          };
        });
      }, 60);
      return;
    }

    setActiveBreak((prev) => {
      if (!prev) return null;
      const currentStart = new Date(prev.startTime).getTime();
      return {
        ...prev,
        startTime: new Date(currentStart - sec * 1000).toISOString(),
      };
    });
  };

  const jumpToAlarmTest = (mode: 'warning' | 'limit') => {
    const allowanceSec = settings.dailyAllowanceMinutes * 60;
    const warningSec = settings.warningMinutesBeforeEnd * 60;
    const alreadyUsed = todayCompletedSeconds;

    // Remaining seconds before warning: (allowanceSec - alreadyUsed) - warningSec
    // To trigger warning in 10 seconds:
    const targetElapsedSeconds = mode === 'warning'
      ? Math.max(0, allowanceSec - alreadyUsed - warningSec - 10)
      : Math.max(0, allowanceSec - alreadyUsed - 10);

    const newStartTime = new Date(Date.now() - targetElapsedSeconds * 1000).toISOString();

    if (mode === 'warning') {
      warningAlarmFiredRef.current = false;
    } else {
      limitAlarmFiredRef.current = false;
    }

    if (!activeBreak) {
      const now = new Date();
      const dayKey = getDayKey(now, settings.resetHour);
      const newBreak: BreakRecord = {
        id: `brk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        startTime: newStartTime,
        endTime: null,
        durationSeconds: targetElapsedSeconds,
        note: `Test (${mode === 'warning' ? 'ostrzeżenie 3 min' : 'limit 30 min'})`,
        dayKey,
      };
      setActiveBreak(newBreak);
      startBackgroundKeepAlive();
    } else {
      setActiveBreak((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          startTime: newStartTime,
        };
      });
    }
  };

  const exportDataJSON = () => {
    return JSON.stringify(
      {
        settings,
        breaks,
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
      },
      null,
      2
    );
  };

  const importDataJSON = (jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      if (Array.isArray(data.breaks)) {
        setBreaks(data.breaks);
      }
      if (data.settings && typeof data.settings === 'object') {
        updateSettings(data.settings);
      }
      return true;
    } catch (e) {
      console.error('Import error:', e);
      return false;
    }
  };

  // Handle URL shortcut triggers e.g. from PWA shortcut or widget (?action=start / ?action=stop)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const action = url.searchParams.get('action');

    // Check if coworker scanned QR code or clicked shared link with ?webhook=...
    const webhookParam = url.searchParams.get('webhook');
    if (webhookParam) {
      try {
        const decodedWebhook = decodeURIComponent(webhookParam);
        updateSettings({
          googleChatWebhookUrl: decodedWebhook,
          includeNameInSimpleMessage: true,
        });
      } catch {
        updateSettings({
          googleChatWebhookUrl: webhookParam,
          includeNameInSimpleMessage: true,
        });
      }
      url.searchParams.delete('webhook');
      window.history.replaceState({}, '', url.toString());
    }

    if (action === 'start' && !activeBreak) {
      startBreak();
      url.searchParams.delete('action');
      window.history.replaceState({}, '', url.toString());
    } else if (action === 'stop' && activeBreak) {
      stopBreak();
      url.searchParams.delete('action');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Handle background notification clicks & broadcast channel triggers
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const channel = getControlChannel();
    let lastActionHandledMs = 0;
    const handleActionMessage = (action: string) => {
      const now = Date.now();
      if (now - lastActionHandledMs < 1200) return;
      lastActionHandledMs = now;

      if (action === 'start') {
        startBreak('Pasek powiadomień');
      } else if (action === 'stop') {
        stopBreak();
      }
    };

    if (channel) {
      channel.onmessage = (event) => {
        if (event.data && event.data.type === 'NOTIFICATION_ACTION') {
          handleActionMessage(event.data.action);
        }
      };
    }

    const swMessageHandler = (event: MessageEvent) => {
      if (event.data && event.data.type === 'NOTIFICATION_ACTION') {
        handleActionMessage(event.data.action);
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', swMessageHandler);
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', swMessageHandler);
      }
    };
  }, [startBreak, stopBreak]);

  // Keep system notification bar controls synchronized
  useEffect(() => {
    if (settings.notificationBarControlsEnabled !== false) {
      if (settings.notificationBarOnlyDuringBreak !== false && !activeBreak) {
        clearSystemNotificationBar();
      } else {
        updateSystemNotificationBar({
          isBreakActive: !!activeBreak,
          currentBreakSeconds,
          remainingSeconds: todaySummary.remainingSeconds,
          allowanceSeconds: todaySummary.allowanceSeconds,
          enabled: true,
          onlyDuringBreak: settings.notificationBarOnlyDuringBreak !== false,
          titleStyle: settings.notificationBarTitleStyle ?? 'countdown_and_return',
        });
      }
    } else {
      clearSystemNotificationBar();
    }
  }, [
    activeBreak,
    currentBreakSeconds,
    todaySummary.remainingSeconds,
    todaySummary.allowanceSeconds,
    settings.notificationBarControlsEnabled,
    settings.notificationBarOnlyDuringBreak,
    settings.notificationBarTitleStyle,
  ]);

  return (
    <BreakContext.Provider
      value={{
        settings,
        updateSettings,
        breaks,
        activeBreak,
        currentBreakSeconds,
        todaySummary,
        webhookLogs,
        startBreak,
        stopBreak,
        deleteBreak,
        updateBreak,
        addManualBreak,
        clearTodayBreaks,
        clearAllHistory,
        testWebhook,
        testSoundAlarm,
        testVibration,
        lastWebhookStatus,
        exportDataJSON,
        importDataJSON,
        fastForwardSeconds,
        jumpToAlarmTest,
        undoState,
        undoLastAction,
        dismissUndo,
        powerOffWarning,
        resolvePowerOffBreak,
      }}
    >
      {children}
    </BreakContext.Provider>
  );
};

export function useBreaks() {
  const context = useContext(BreakContext);
  if (!context) {
    throw new Error('useBreaks must be used within a BreakProvider');
  }
  return context;
}
