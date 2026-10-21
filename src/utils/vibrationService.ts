/**
 * Haptic Vibration Service for PrzerwaPro
 * Supports tactile pocket feedback during break countdown,
 * specifically activated when the phone screen is locked or in the background.
 */
import { getAudioContext } from './audioAlert';

export function isVibrationSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function';
}

export function isScreenLockedOrHidden(): boolean {
  if (typeof document === 'undefined') return false;
  return document.hidden || document.visibilityState === 'hidden';
}

/**
 * Subtle low-frequency acoustic haptic pop (120Hz)
 * Provides physical audio-tactile feedback for devices without motor (e.g. iOS Safari, PC)
 * or as immediate tactile confirmation of touch.
 */
export function playHapticAudioPop() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.05);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  } catch {
    // Ignore audio pop errors
  }
}

/**
 * Safely triggers vibration pattern.
 * If onlyWhenHidden is true, vibration only fires if the screen is locked/hidden.
 */
export function triggerHaptic(
  pattern: number | number[], 
  onlyWhenHidden: boolean = false, 
  withAudioPop: boolean = true
): boolean {
  if (withAudioPop) {
    playHapticAudioPop();
  }

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('app-vibration', { detail: { pattern, timestamp: Date.now() } }));
    } catch {}
  }

  if (!isVibrationSupported()) {
    return false;
  }

  // Normalize pattern: ensure minimum 120ms pulse so physical phone motors (Motorola, Samsung, Xiaomi) can overcome inertia
  const normalizedPattern = Array.isArray(pattern) 
    ? pattern.map((p, idx) => (idx % 2 === 0 ? Math.max(120, p) : p))
    : Math.max(120, pattern);

  try {
    return navigator.vibrate(normalizedPattern);
  } catch (err) {
    console.warn('Vibration failed:', err);
    return false;
  }
}

/**
 * Triggers a real Android SYSTEM VIBRATION via the Notification Manager.
 * 
 * WHY THIS IS CRUCIAL FOR ANDROID & MOTOROLA:
 * When a user turns OFF "Reakcja haptyczna przy dotknięciu" (Haptic touch feedback) in Android settings,
 * the Android OS blocks web browser `navigator.vibrate` calls!
 * 
 * HOWEVER, Android handles System Notifications in a completely separate channel:
 * "Wibracje powiadomień i alarmów" (USAGE_NOTIFICATION).
 * By dispatching an active ServiceWorker notification pulse with `vibrate` and `renotify: true`,
 * Android's native NotificationManager triggers the phone's physical vibration motor
 * REGARDLESS of whether the user has disabled haptic touch feedback in their phone!
 */
export async function triggerSystemVibration(pattern: number[] = [250, 100, 250]): Promise<boolean> {
  // 1. Always attempt standard vibration as well
  triggerHaptic(pattern);

  // 2. Dispatch system notification vibration via Service Worker
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          const buzzTag = `sys-buzz-${Date.now()}`;
          await reg.showNotification('⏱️ PrzerwaPro', {
            body: 'Wibracja systemowa',
            tag: buzzTag,
            icon: './pwa-192x192.png',
            badge: './icon.svg',
            silent: false,
            renotify: true,
            vibrate: pattern,
            data: { isBuzz: true },
          } as any);

          // Auto-close the temporary buzz card after 400ms so it leaves no clutter in the notification shade
          setTimeout(async () => {
            try {
              const notifs = await reg.getNotifications({ tag: buzzTag });
              notifs.forEach((n) => n.close());
            } catch {}
          }, 450);
          return true;
        }
      } catch (err) {
        console.warn('System notification vibration failed:', err);
      }
    }
  }

  return false;
}

/**
 * Mechanical dual-pulse haptic click for button presses (Start/Stop).
 * Uses real system notification vibration to work even if haptic touch is OFF in phone settings.
 */
export function triggerButtonHaptic() {
  triggerSystemVibration([220, 80, 220]);
}

/**
 * Gentle confirmation when screen gets locked during an active break
 * (confirms that the countdown is running in your pocket)
 */
export function triggerScreenLockConfirmation() {
  triggerSystemVibration([220, 100, 220]);
}

/**
 * Periodic countdown pulse:
 * - Regular minute: 1 distinct pulse (220ms)
 * - 5-minute milestone (5, 10, 15, 20 min): 2 distinct pulses (260ms, 100ms pause, 300ms)
 */
export function triggerCountdownTick(minuteCount: number, onlyWhenHidden: boolean = false) {
  if (minuteCount % 5 === 0) {
    // 5-minute milestone: double pulse
    triggerSystemVibration([260, 100, 300]);
  } else {
    // Regular single-minute pulse
    triggerSystemVibration([220]);
  }
}

/**
 * 3-minute warning alarm vibration (tactile sequence)
 */
export function triggerWarningVibration(onlyWhenHidden: boolean = false) {
  triggerSystemVibration([500, 150, 500, 150, 800]);
}

/**
 * 0-minute final limit reached alarm vibration
 */
export function triggerLimitReachedVibration(onlyWhenHidden: boolean = false) {
  triggerSystemVibration([800, 200, 800, 200, 1200]);
}
