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
  if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }
  return false;
}

let lastNotificationUpdateMs = 0;
let mediaSessionHandlersBound = false;

function bindMediaSessionHandlers() {
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
 * Updates the persistent system notification bar with START / STOP action buttons
 */
export async function updateSystemNotificationBar(state: NotificationControlState) {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  // If controls are disabled, or if configured to only show during active break and no break is active
  if (!state.enabled || (state.onlyDuringBreak !== false && !state.isBreakActive)) {
    clearSystemNotificationBar();
    return;
  }

  // Throttle notification updates to at most once per 800ms
  const now = Date.now();
  if (state.isBreakActive && now - lastNotificationUpdateMs < 800) {
    return;
  }
  lastNotificationUpdateMs = now;

  try {
    bindMediaSessionHandlers();
    const reg = await navigator.serviceWorker.ready;
    if (!reg || !reg.showNotification) return;

    const { isBreakActive, currentBreakSeconds, remainingSeconds, allowanceSeconds } = state;

    // Prominent title with timer so it is immediately visible on Android lock screen
    const title = isBreakActive 
      ? `⏱️ ${formatDuration(currentBreakSeconds)} • Przerwa (zostało: ${formatDuration(remainingSeconds)})` 
      : `☕ PrzerwaPro • Pozostało: ${formatDuration(remainingSeconds)}`;
    const body = isBreakActive
      ? `Licznik bieżący: ${formatDuration(currentBreakSeconds)} | Pozostały limit: ${formatDuration(remainingSeconds)} / ${formatDuration(allowanceSeconds)}`
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

    // Also update MediaSession API (for Android lockscreen controls)
    updateMediaSessionControls(state);
  } catch (err) {
    // Ignore notification display errors
  }
}

/**
 * Closes the persistent notification bar
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

  if (!('serviceWorker' in navigator)) return;

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
 * Updates Android MediaSession on lockscreen
 */
function updateMediaSessionControls(state: NotificationControlState) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

  try {
    const { isBreakActive, currentBreakSeconds, remainingSeconds, allowanceSeconds } = state;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: isBreakActive 
        ? `⏱️ ${formatDuration(currentBreakSeconds)} (Czas przerwy)` 
        : '☕ Gotowość do przerwy',
      artist: isBreakActive
        ? `Pozostało dzisiaj: ${formatDuration(remainingSeconds)}`
        : `Dzienny limit: ${formatDuration(allowanceSeconds)}`,
      album: isBreakActive 
        ? 'PrzerwaPro (Dotknij Stop aby zakończyć)' 
        : 'PrzerwaPro (Dotknij Play aby zacząć)',
      artwork: [
        { src: './pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: './pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
    });

    navigator.mediaSession.playbackState = isBreakActive ? 'playing' : 'paused';

    if ('setPositionState' in navigator.mediaSession && isBreakActive) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(allowanceSeconds, currentBreakSeconds + 1),
          playbackRate: 1,
          position: Math.min(allowanceSeconds, currentBreakSeconds),
        });
      } catch (e) {
        // Ignore
      }
    }
  } catch (e) {
    // Ignore
  }
}
