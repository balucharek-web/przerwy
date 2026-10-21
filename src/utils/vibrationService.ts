/**
 * Native Android System Vibration Service for PrzerwaPro
 * Uses pure system notifications and native motor vibration without any audio synthesizers.
 */

export function isVibrationSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function';
}

export function isScreenLockedOrHidden(): boolean {
  if (typeof document === 'undefined') return false;
  return document.hidden || document.visibilityState === 'hidden';
}

/**
 * Standard native physical vibration.
 */
export function triggerHaptic(
  pattern: number | number[] = 250, 
  onlyWhenHidden: boolean = false
): boolean {
  if (onlyWhenHidden && !isScreenLockedOrHidden()) {
    return false;
  }

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('app-vibration', { detail: { pattern, timestamp: Date.now() } }));
    } catch {}
  }

  if (!isVibrationSupported()) {
    return false;
  }

  try {
    return navigator.vibrate(pattern);
  } catch (err) {
    console.warn('Vibration failed:', err);
    return false;
  }
}

/**
 * Triggers pure Android System Notification vibration.
 */
export async function triggerSystemVibration(pattern: number[] = [400, 150, 400], sendNotification: boolean = false): Promise<boolean> {
  // 1. Hardware motor call
  const hapticSuccess = triggerHaptic(pattern);

  // 2. If screen is hidden (pocket) or for alarms, dispatch via Service Worker
  const isHidden = isScreenLockedOrHidden();
  if ((sendNotification || isHidden) && typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          const buzzTag = `sys-buzz-${Date.now()}`;
          await reg.showNotification('⏱️ PrzerwaPro', {
            body: 'Powiadomienie systemowe',
            tag: buzzTag,
            icon: './pwa-192x192.png',
            badge: './icon.svg',
            silent: false,
            renotify: true,
            vibrate: pattern,
            data: { isBuzz: true },
          } as any);

          const totalDuration = Array.isArray(pattern) ? pattern.reduce((a, b) => a + b, 0) : pattern;
          const closeDelay = Math.max(1200, totalDuration + 300);

          setTimeout(async () => {
            try {
              const notifs = await reg.getNotifications({ tag: buzzTag });
              notifs.forEach((n) => n.close());
            } catch {}
          }, closeDelay);
          return true;
        }
      } catch (err) {
        console.warn('System notification vibration failed:', err);
      }
    }
  }

  return hapticSuccess;
}

export function getButtonPattern(): number[] {
  return [300, 100, 300];
}

export function getWarningPattern(): number[] {
  return [600, 150, 600, 150, 800];
}

export function getLimitReachedPattern(): number[] {
  return [800, 200, 800, 200, 1000];
}

export function getTickPattern(minuteCount: number): number[] {
  return minuteCount % 5 === 0 ? [400, 100, 400] : [300];
}

export function setVibrationIntensity(_intensity: any) {}

export function testContinuousVibration(durationMs: number = 1500): boolean {
  if (!isVibrationSupported()) return false;
  try {
    return navigator.vibrate(durationMs);
  } catch {
    return false;
  }
}

/**
 * Native click vibration for buttons (Start/Stop)
 */
export function triggerButtonHaptic() {
  triggerSystemVibration([300, 100, 300]);
}

/**
 * Native pocket confirmation when screen is locked
 */
export function triggerScreenLockConfirmation() {
  triggerSystemVibration([250, 100, 250]);
}

/**
 * Native periodic countdown pulse in pocket
 */
export function triggerCountdownTick(minuteCount: number, onlyWhenHidden: boolean = false) {
  if (minuteCount % 5 === 0) {
    triggerSystemVibration([400, 100, 400]);
  } else {
    triggerSystemVibration([300]);
  }
}

/**
 * 3-minute warning alarm vibration
 */
export function triggerWarningVibration(onlyWhenHidden: boolean = false) {
  triggerSystemVibration([600, 150, 600, 150, 800], true);
}

/**
 * 0-minute final limit reached alarm vibration
 */
export function triggerLimitReachedVibration(onlyWhenHidden: boolean = false) {
  triggerSystemVibration([800, 200, 800, 200, 1000], true);
}
