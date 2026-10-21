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
 * sendNotification is ONLY true for real alarm events (warning / limit reached).
 */
export async function triggerSystemVibration(pattern: number[] = [400, 150, 400], sendNotification: boolean = false): Promise<boolean> {
  // 1. Hardware motor call
  const hapticSuccess = triggerHaptic(pattern);

  // 2. Dispatch system notification ONLY when explicitly requested for real alarms
  if (sendNotification && typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          const buzzTag = `sys-alarm-${Date.now()}`;
          await reg.showNotification('⏱️ PrzerwaPro - Alarm', {
            body: 'Czas przerwy dobiega końca!',
            tag: buzzTag,
            icon: './pwa-192x192.png',
            badge: './icon.svg',
            silent: false,
            renotify: true,
            vibrate: pattern,
          } as any);
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
  return [200];
}

export function getWarningPattern(): number[] {
  return [600, 150, 600, 150, 800];
}

export function getLimitReachedPattern(): number[] {
  return [800, 200, 800, 200, 1000];
}

export function getTickPattern(minuteCount: number): number[] {
  return minuteCount % 5 === 0 ? [350, 100, 350] : [250];
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
 * Click vibration for buttons (Start/Stop) - MOTOR ONLY, NO NOTIFICATION
 */
export function triggerButtonHaptic() {
  triggerHaptic([200]);
}

/**
 * Pocket confirmation when screen is locked - MOTOR ONLY, NO NOTIFICATION
 */
export function triggerScreenLockConfirmation() {
  triggerHaptic([250, 100, 250]);
}

/**
 * Periodic countdown pulse in pocket - MOTOR ONLY, NO NOTIFICATION
 */
export function triggerCountdownTick(minuteCount: number, _onlyWhenHidden: boolean = false) {
  if (minuteCount % 5 === 0) {
    triggerHaptic([350, 100, 350]);
  } else {
    triggerHaptic([250]);
  }
}

/**
 * 3-minute warning alarm vibration (with system notification)
 */
export function triggerWarningVibration(onlyWhenHidden: boolean = false) {
  triggerSystemVibration([600, 150, 600, 150, 800], true);
}

/**
 * 0-minute final limit reached alarm vibration (with system notification)
 */
export function triggerLimitReachedVibration(onlyWhenHidden: boolean = false) {
  triggerSystemVibration([800, 200, 800, 200, 1000], true);
}
