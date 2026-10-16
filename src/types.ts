export interface BreakRecord {
  id: string;
  startTime: string; // ISO string
  endTime: string | null; // ISO string or null if currently active
  durationSeconds: number;
  note?: string;
  dayKey: string; // YYYY-MM-DD representing the assigned work day
}

export interface UserSettings {
  dailyAllowanceMinutes: number; // default 30
  warningMinutesBeforeEnd: number; // default 3 (alarm 3 min before end)
  resetHour: string; // "HH:mm", default "00:00" (midnight)
  googleChatWebhookUrl: string;
  googleChatUserName: string;
  soundAlertsEnabled: boolean;
  alarmVolume?: number; // 0 to 100, default 80
  browserNotificationsEnabled: boolean;
  vibrateEnabled: boolean;
  simpleChatMessages: boolean; // default true: sends literally 'start' / 'stop'
  startMessageText: string; // default 'start'
  stopMessageText: string; // default 'stop'
  includeNameInSimpleMessage?: boolean; // default false: adds "Imię: start" / "Imię: stop" for shared team webhooks
  notificationBarControlsEnabled?: boolean; // default true: shows start/stop notification bar controls
  notificationBarOnlyDuringBreak?: boolean; // default true: shows notification ONLY while break is active, disappears on stop
}

export interface WebhookLog {
  id: string;
  timestamp: string;
  action: 'start' | 'stop' | 'test';
  status: 'success' | 'error';
  message: string;
}

export interface DayBreakSummary {
  dayKey: string; // YYYY-MM-DD
  date: Date;
  breaks: BreakRecord[];
  totalSeconds: number;
  allowanceSeconds: number;
  isOverLimit: boolean;
  remainingSeconds: number;
}
