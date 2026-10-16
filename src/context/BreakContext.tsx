import React, { createContext, useContext, useEffect, useRef, useState, useMemo } from 'react';
import { BreakRecord, UserSettings, WebhookLog, DayBreakSummary } from '../types';
import { getDayKey } from '../utils/dateUtils';
import { playWarningAlarm, playLimitReachedAlarm, playToggleFeedback, sendSystemNotification } from '../utils/audioAlert';
import { sendGoogleChatWebhook } from '../utils/googleChatService';

interface BreakContextType {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  breaks: BreakRecord[];
  activeBreak: BreakRecord | null;
  currentBreakSeconds: number;
  todaySummary: DayBreakSummary;
  webhookLogs: WebhookLog[];
  startBreak: (note?: string) => Promise<void>;
  stopBreak: (note?: string) => Promise<void>;
  deleteBreak: (id: string) => void;
  updateBreak: (id: string, updates: Partial<BreakRecord>) => void;
  addManualBreak: (record: { startTime: string; endTime: string; note?: string }) => void;
  clearTodayBreaks: () => void;
  clearAllHistory: () => void;
  testWebhook: () => Promise<WebhookLog>;
  testSoundAlarm: (type: 'warning' | 'final') => void;
  lastWebhookStatus: { status: 'idle' | 'sending' | 'success' | 'error'; message: string };
  exportDataJSON: () => string;
  importDataJSON: (jsonStr: string) => boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  dailyAllowanceMinutes: 30,
  warningMinutesBeforeEnd: 3,
  resetHour: '00:00',
  googleChatWebhookUrl: '',
  googleChatUserName: 'Pracownik',
  soundAlertsEnabled: true,
  browserNotificationsEnabled: true,
  vibrateEnabled: true,
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
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // History break records
  const [breaks, setBreaks] = useState<BreakRecord[]>(() => {
    try {
      const saved = localStorage.getItem(RECORDS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
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

  // Flags to avoid multiple alarms in the same break session
  const warningAlarmFiredRef = useRef<boolean>(false);
  const limitAlarmFiredRef = useRef<boolean>(false);

  // Save settings
  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // Save breaks
  useEffect(() => {
    localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(breaks));
  }, [breaks]);

  // Save active break
  useEffect(() => {
    if (activeBreak) {
      localStorage.setItem(ACTIVE_BREAK_KEY, JSON.stringify(activeBreak));
    } else {
      localStorage.removeItem(ACTIVE_BREAK_KEY);
      warningAlarmFiredRef.current = false;
      limitAlarmFiredRef.current = false;
      setCurrentBreakSeconds(0);
    }
  }, [activeBreak]);

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

  // Timer interval for active break
  useEffect(() => {
    if (!activeBreak) return;

    const updateTimer = () => {
      const startMs = new Date(activeBreak.startTime).getTime();
      const nowMs = Date.now();
      const elapsed = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      setCurrentBreakSeconds(elapsed);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeBreak]);

  // Current day key based on resetHour
  const currentDayKey = useMemo(() => {
    return getDayKey(new Date(), settings.resetHour);
  }, [settings.resetHour]);

  // Breaks completed today
  const todayCompletedBreaks = useMemo(() => {
    return breaks.filter((b) => b.dayKey === currentDayKey);
  }, [breaks, currentDayKey]);

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

  // Sound Alarm Monitor: Checks 3 min warning and limit reached
  useEffect(() => {
    if (!activeBreak || !settings.soundAlertsEnabled) return;

    const warningThresholdSeconds = settings.warningMinutesBeforeEnd * 60;

    // 1. Check warning alarm (e.g. 3 minutes remaining)
    if (
      remainingSeconds <= warningThresholdSeconds &&
      remainingSeconds > 0 &&
      !warningAlarmFiredRef.current
    ) {
      warningAlarmFiredRef.current = true;
      playWarningAlarm();

      if (settings.browserNotificationsEnabled) {
        sendSystemNotification('⚠️ Zbliża się koniec przerwy!', {
          body: `Zostały tylko ${settings.warningMinutesBeforeEnd} minuty z Twojego dziennego limitu (${settings.dailyAllowanceMinutes} min).`,
          tag: 'break-warning',
        });
      }
    }

    // 2. Check 0 min limit alarm
    if (remainingSeconds <= 0 && !limitAlarmFiredRef.current) {
      limitAlarmFiredRef.current = true;
      playLimitReachedAlarm();

      if (settings.browserNotificationsEnabled) {
        sendSystemNotification('⏰ Limit przerwy wykorzystany!', {
          body: `Twój limit ${settings.dailyAllowanceMinutes} minut na dzisiaj właśnie się skończył.`,
          tag: 'break-limit',
        });
      }
    }
  }, [activeBreak, remainingSeconds, settings]);

  // START BREAK
  const startBreak = async (note?: string) => {
    if (activeBreak) return;

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
    playToggleFeedback(true);

    if (settings.googleChatWebhookUrl) {
      setLastWebhookStatus({ status: 'sending', message: 'Wysyłanie na Google Chat...' });
      sendGoogleChatWebhook({
        webhookUrl: settings.googleChatWebhookUrl,
        userName: settings.googleChatUserName,
        action: 'start',
        totalUsedSecondsToday: todayCompletedSeconds,
        dailyAllowanceSeconds: allowanceSeconds,
      }).then((log) => addWebhookLog(log));
    }
  };

  // STOP BREAK
  const stopBreak = async (note?: string) => {
    if (!activeBreak) return;

    const now = new Date();
    const startMs = new Date(activeBreak.startTime).getTime();
    const duration = Math.max(1, Math.round((now.getTime() - startMs) / 1000));

    const completed: BreakRecord = {
      ...activeBreak,
      endTime: now.toISOString(),
      durationSeconds: duration,
      note: note !== undefined ? note : activeBreak.note,
    };

    setBreaks((prev) => [completed, ...prev]);
    setActiveBreak(null);
    playToggleFeedback(false);

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
      }).then((log) => addWebhookLog(log));
    }
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

  const testSoundAlarm = (type: 'warning' | 'final') => {
    if (type === 'warning') {
      playWarningAlarm();
    } else {
      playLimitReachedAlarm();
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
        lastWebhookStatus,
        exportDataJSON,
        importDataJSON,
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
