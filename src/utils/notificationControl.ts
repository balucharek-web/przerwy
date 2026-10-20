import { formatDuration } from './dateUtils';

const NOTIFICATION_TAG = 'przerwa-persistent-control';
let controlChannel: BroadcastChannel | null = null;

export function getControlChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (!controlChannel && typeof BroadcastChannel !== 'undefined') {
    controlChannel = new BroadcastChannel('break_control_channel');
  }
  return controlChannel;
}

export interface NotificationControlState {
  isBreakActive: boolean;
  currentBreakSeconds: number;
  remainingSeconds: number;
  allowanceSeconds: number;
  enabled: boolean;
  onlyDuringBreak?: boolean;
}

/**
 * Requests browser notification permission if not yet decided
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission === 'default') {
    try {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    } catch {
      return false;
    }
  }
  return false;
}

let lastNotificationUpdateMs = 0;
let mediaSessionHandlersBound = false;

export function bindMediaSessionHandlers() {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  try {
    // Explicitly unbind all mediaSession handlers so Chrome NEVER shows the media player notification
    const actions: MediaSessionAction[] = ['play', 'pause', 'stop', 'seekbackward', 'seekforward', 'previoustrack', 'nexttrack'];
    actions.forEach((act) => {
      try {
        navigator.mediaSession.setActionHandler(act, null);
      } catch {}
    });
    navigator.mediaSession.playbackState = 'none';
    navigator.mediaSession.metadata = null;
  } catch {}
}

let lastNotificationBreakState: boolean | null = null;
let lastNotifiedMinute: number = -1;

/**
 * Updates the system notification bar with real-time countdown.
 * Strictly ONE persistent notification card is shown (NO duplicate Chrome media player).
 */
export async function updateSystemNotificationBar(state: NotificationControlState, forceUpdate = false) {
  if (typeof window === 'undefined') return;

  // 1. Ensure duplicate Chrome media player is NEVER shown
  if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
    try {
      navigator.mediaSession.playbackState = 'none';
      navigator.mediaSession.metadata = null;
    } catch {}
  }

  // 2. Check if persistent notification bar is enabled and break is active
  if (!state.enabled || (state.onlyDuringBreak !== false && !state.isBreakActive)) {
    lastNotificationBreakState = false;
    lastNotifiedMinute = -1;
    clearNotificationOnly();
    return;
  }

  if (!('serviceWorker' in navigator) || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const now = Date.now();
  const stateChanged = lastNotificationBreakState !== state.isBreakActive;
  const elapsedSinceLast = now - lastNotificationUpdateMs;

  // Update in REAL TIME: every 1 second (1000ms) or immediately when state changes or forced
  const shouldUpdate = forceUpdate || stateChanged || elapsedSinceLast >= 1000;

  if (!shouldUpdate && state.isBreakActive) {
    return;
  }

  lastNotificationUpdateMs = now;
  lastNotificationBreakState = state.isBreakActive;

  try {
    const reg = await navigator.serviceWorker.ready;
    if (!reg || !reg.showNotification) return;

    const { isBreakActive, currentBreakSeconds, remainingSeconds, allowanceSeconds } = state;
    
    // Construct robust appBase supporting both GitHub Pages subpath (/przerwy/) and root (/)
    const origin = window.location.origin;
    const cleanPath = window.location.pathname.replace(/\/+$/, '');
    const appBase = `${origin}${cleanPath}`;
    const iconUrl = `${appBase}/pwa-192x192.png`;
    const badgeUrl = `${appBase}/icon.svg`;

    // Calculate estimated return time and start time
    const returnDate = new Date(now + Math.max(0, remainingSeconds) * 1000);
    const returnTimeStr = `${String(returnDate.getHours()).padStart(2, '0')}:${String(returnDate.getMinutes()).padStart(2, '0')}`;
    
    const startDate = new Date(now - currentBreakSeconds * 1000);
    const startTimeStr = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;

    // Prominent title and body with absolute wall-clock target time so it NEVER looks frozen or desynced even while gaming!
    const title = isBreakActive 
      ? `☕ Powrót do pracy: ${returnTimeStr}` 
      : `☕ PrzerwaPro • Limit: ${formatDuration(allowanceSeconds)}`;
    
    const body = isBreakActive
      ? `Koniec przerwy o ${returnTimeStr} • Start: ${startTimeStr} (Limit: ${formatDuration(allowanceSeconds)})`
      : `Pozostały limit na dzisiaj: ${formatDuration(remainingSeconds)}`;

    // Android notification action buttons
    const actions = isBreakActive
      ? [
          {
            action: 'stop_break',
            title: '⏹ ZAKOŃCZ PRZERWĘ (STOP)',
          },
        ]
      : [
          {
            action: 'start_break',
            title: '▶ ROZPOCZNIJ PRZERWĘ (START)',
          },
        ];

    // CRITICAL:
    // 1. DO NOT set silent: true! On Android, silent notifications are hidden from the lock screen by default!
    // 2. renotify: false ensures NO repeated sounds or vibration buzzes when updating.
    // 3. visibility: 'public' instructs Android Lock Screen to show full details.
    // 4. ongoing: true keeps it pinned while active.
    await reg.showNotification(title, {
      body,
      tag: NOTIFICATION_TAG,
      icon: iconUrl,
      badge: badgeUrl,
      actions,
      renotify: false,
      requireInteraction: isBreakActive,
      ongoing: isBreakActive,
      timestamp: startDate.getTime(),
      visibility: 'public',
      data: {
        isBreakActive,
        updatedAt: now,
        url: `${origin}/?mode=widget`,
      },
    } as any);
  } catch (err) {
    // Ignore notification display errors
  }
}

/**
 * Closes only the persistent notification
 */
async function clearNotificationOnly() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    if (reg && reg.getNotifications) {
      const notifs = await reg.getNotifications({ tag: NOTIFICATION_TAG });
      notifs.forEach((n) => n.close());
    }
  } catch (e) {
    // Ignore
  }
}

/**
 * Closes both notification and lock screen controls
 */
export async function clearSystemNotificationBar() {
  if (typeof window === 'undefined') return;

  if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
    try {
      navigator.mediaSession.playbackState = 'none';
      navigator.mediaSession.metadata = null;
    } catch (e) {
      // Ignore
    }
  }

  await clearNotificationOnly();
}

/**
 * Updates Android and iOS MediaSession on the phone Lock Screen
 * This renders the native lock-screen player with current ticking time,
 * remaining time, return time, and Pause/Stop buttons!
 */
export function updateMediaSessionControls(_state: NotificationControlState) {
  // Disabled: Strictly ONE notification bar timer (the notification card with the STOP button),
  // rather than having a duplicate Chrome media player widget.
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.playbackState = 'none';
    navigator.mediaSession.metadata = null;
  } catch {}
}
