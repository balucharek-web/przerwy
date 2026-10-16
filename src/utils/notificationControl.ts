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

  try {
    const reg = await navigator.serviceWorker.ready;
    if (!reg || !reg.showNotification) return;

    const { isBreakActive, currentBreakSeconds, remainingSeconds, allowanceSeconds } = state;

    const title = isBreakActive ? '⏱️ Trwa przerwa' : '☕ Gotowość do przerwy';
    const body = isBreakActive
      ? `Czas przerwy: ${formatDuration(currentBreakSeconds)} • Pozostało limitu: ${formatDuration(remainingSeconds)}`
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
      data: {
        isBreakActive,
        updatedAt: Date.now(),
      },
    } as NotificationOptions);

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
      title: isBreakActive ? `Trwa przerwa: ${formatDuration(currentBreakSeconds)}` : 'W pracy (gotowość)',
      artist: `Pozostały limit: ${formatDuration(remainingSeconds)}`,
      album: `PrzerwaPro (${formatDuration(allowanceSeconds)} limit)`,
      artwork: [
        { src: './pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: './pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
    });

    navigator.mediaSession.playbackState = isBreakActive ? 'playing' : 'paused';
  } catch (e) {
    // Ignore
  }
}
