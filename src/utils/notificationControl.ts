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
  if (mediaSessionHandlersBound) return;
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  try {
    const handleStop = () => {
      const channel = getControlChannel();
      if (channel) {
        channel.postMessage({ type: 'NOTIFICATION_ACTION', action: 'stop' });
      }
    };
    const handleStart = () => {
      const channel = getControlChannel();
      if (channel) {
        channel.postMessage({ type: 'NOTIFICATION_ACTION', action: 'start' });
      }
    };
    navigator.mediaSession.setActionHandler('stop', handleStop);
    navigator.mediaSession.setActionHandler('pause', handleStop);
    navigator.mediaSession.setActionHandler('play', handleStart);
    mediaSessionHandlersBound = true;
  } catch (e) {
    // Ignore
  }
}

/**
 * Updates the lock screen media session widget and system notification bar
 */
export async function updateSystemNotificationBar(state: NotificationControlState) {
  if (typeof window === 'undefined') return;

  // 1. ALWAYS update Android/iOS Lock Screen MediaSession controls (works without notification permission!)
  updateMediaSessionControls(state);

  // 2. Check if persistent notification bar is enabled and break is active
  if (!state.enabled || (state.onlyDuringBreak !== false && !state.isBreakActive)) {
    clearNotificationOnly();
    return;
  }

  if (!('serviceWorker' in navigator) || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  // Throttle notification updates to at most once per 1000ms
  const now = Date.now();
  if (state.isBreakActive && now - lastNotificationUpdateMs < 1000) {
    return;
  }
  lastNotificationUpdateMs = now;

  try {
    const reg = await navigator.serviceWorker.ready;
    if (!reg || !reg.showNotification) return;

    const { isBreakActive, currentBreakSeconds, remainingSeconds, allowanceSeconds } = state;

    // Calculate estimated return time
    const returnDate = new Date(now + Math.max(0, remainingSeconds) * 1000);
    const returnTimeStr = `${String(returnDate.getHours()).padStart(2, '0')}:${String(returnDate.getMinutes()).padStart(2, '0')}`;

    // Prominent title with timer so it is immediately visible on Android lock screen
    const title = isBreakActive 
      ? `⏱️ ${formatDuration(currentBreakSeconds)} • Przerwa (Zostało: ${formatDuration(remainingSeconds)})` 
      : `☕ PrzerwaPro • Pozostało: ${formatDuration(remainingSeconds)}`;
    
    const body = isBreakActive
      ? `Powrót do pracy: ${returnTimeStr} | Dzienny limit: ${formatDuration(allowanceSeconds)}`
      : `Pozostały limit: ${formatDuration(remainingSeconds)} / ${formatDuration(allowanceSeconds)}`;

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

    await reg.showNotification(title, {
      body,
      tag: NOTIFICATION_TAG,
      icon: './pwa-192x192.png',
      badge: './icon.svg',
      actions,
      silent: true,
      renotify: false,
      requireInteraction: isBreakActive,
      ongoing: isBreakActive,
      timestamp: Date.now(),
      data: {
        isBreakActive,
        updatedAt: Date.now(),
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
export function updateMediaSessionControls(state: NotificationControlState) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

  try {
    bindMediaSessionHandlers();

    const { isBreakActive, currentBreakSeconds, remainingSeconds, allowanceSeconds } = state;

    if (!isBreakActive) {
      navigator.mediaSession.playbackState = 'none';
      navigator.mediaSession.metadata = null;
      return;
    }

    const now = Date.now();
    const returnDate = new Date(now + Math.max(0, remainingSeconds) * 1000);
    const returnTimeStr = `${String(returnDate.getHours()).padStart(2, '0')}:${String(returnDate.getMinutes()).padStart(2, '0')}`;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: `⏱️ ${formatDuration(currentBreakSeconds)} • Przerwa (Zostało: ${formatDuration(remainingSeconds)})`,
      artist: `🔔 Powrót do pracy: ${returnTimeStr} • Limit: ${formatDuration(allowanceSeconds)}`,
      album: 'PrzerwaPro (Naciśnij Pauza/Stop aby zakończyć)',
      artwork: [
        { src: './pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: './pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
    });

    navigator.mediaSession.playbackState = 'playing';

    if ('setPositionState' in navigator.mediaSession) {
      try {
        const totalDuration = Math.max(allowanceSeconds, currentBreakSeconds + 1);
        navigator.mediaSession.setPositionState({
          duration: totalDuration,
          playbackRate: 1,
          position: Math.min(totalDuration, currentBreakSeconds),
        });
      } catch (e) {
        // Ignore
      }
    }
  } catch (e) {
    // Ignore
  }
}
