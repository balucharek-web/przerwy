/**
 * Haptic Vibration Service for PrzerwaPro
 * Supports tactile pocket feedback during break countdown,
 * specifically activated when the phone screen is locked or in the background.
 */

export function isVibrationSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function';
}

export function isScreenLockedOrHidden(): boolean {
  if (typeof document === 'undefined') return false;
  return document.hidden || document.visibilityState === 'hidden';
}

/**
 * Safely triggers vibration pattern.
 * If onlyWhenHidden is true, vibration only fires if the screen is locked/hidden.
 */
export function triggerHaptic(pattern: number | number[], onlyWhenHidden: boolean = false): boolean {
  if (!isVibrationSupported()) {
    return false;
  }

  // If the user specified to only vibrate when screen is locked/hidden:
  if (onlyWhenHidden && !isScreenLockedOrHidden()) {
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
 * Gentle confirmation when screen gets locked during an active break
 * (confirms that the countdown is running in your pocket)
 */
export function triggerScreenLockConfirmation() {
  triggerHaptic([70, 50, 70], true);
}

/**
 * Periodic countdown pulse while screen is locked:
 * - Regular minute: 1 short discrete pulse (80ms)
 * - 5-minute milestone (5, 10, 15, 20 min): 2 distinct pulses (100ms, 60ms pause, 180ms)
 */
export function triggerCountdownTick(minuteCount: number, onlyWhenHidden: boolean = true) {
  if (minuteCount % 5 === 0) {
    // 5-minute milestone: double pulse
    triggerHaptic([100, 60, 180], onlyWhenHidden);
  } else {
    // Regular single-minute pulse
    triggerHaptic([90], onlyWhenHidden);
  }
}

/**
 * 3-minute warning alarm vibration (tactile sequence)
 */
export function triggerWarningVibration(onlyWhenHidden: boolean = false) {
  triggerHaptic([250, 100, 250, 100, 450], onlyWhenHidden);
}

/**
 * 0-minute final limit reached alarm vibration
 */
export function triggerLimitReachedVibration(onlyWhenHidden: boolean = false) {
  triggerHaptic([400, 120, 400, 120, 600], onlyWhenHidden);
}
