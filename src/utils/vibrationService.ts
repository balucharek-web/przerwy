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

  // Normalize pattern: ensure minimum 60ms pulse so physical phone motors (Samsung, Xiaomi, Pixel) can overcome inertia
  const normalizedPattern = Array.isArray(pattern) 
    ? pattern.map((p, idx) => (idx % 2 === 0 ? Math.max(60, p) : p))
    : Math.max(60, pattern);

  try {
    return navigator.vibrate(normalizedPattern);
  } catch (err) {
    console.warn('Vibration failed:', err);
    return false;
  }
}

/**
 * Gentle confirmation when screen gets locked during an active break
 * (confirms that the countdown is running in your pocket)
 */
export function triggerScreenLockConfirmation() {
  triggerHaptic([160, 90, 160]);
}

/**
 * Periodic countdown pulse:
 * - Regular minute: 1 distinct pulse (180ms)
 * - 5-minute milestone (5, 10, 15, 20 min): 2 distinct pulses (220ms, 90ms pause, 260ms)
 */
export function triggerCountdownTick(minuteCount: number, onlyWhenHidden: boolean = false) {
  if (minuteCount % 5 === 0) {
    // 5-minute milestone: double pulse
    triggerHaptic([220, 90, 260]);
  } else {
    // Regular single-minute pulse
    triggerHaptic([180]);
  }
}

/**
 * 3-minute warning alarm vibration (tactile sequence)
 */
export function triggerWarningVibration(onlyWhenHidden: boolean = false) {
  triggerHaptic([350, 120, 350, 120, 600]);
}

/**
 * 0-minute final limit reached alarm vibration
 */
export function triggerLimitReachedVibration(onlyWhenHidden: boolean = false) {
  triggerHaptic([600, 150, 600, 150, 900]);
}
