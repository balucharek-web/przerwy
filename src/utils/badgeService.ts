/**
 * App Badging API Service for PrzerwaPro
 * Displays remaining break minutes badge directly on the smartphone home screen app icon.
 */

export function isAppBadgeSupported(): boolean {
  return typeof navigator !== 'undefined' && 'setAppBadge' in navigator;
}

export function updateAppBadge(remainingMinutes: number): void {
  if (typeof navigator === 'undefined' || !('setAppBadge' in navigator)) return;
  try {
    const minutes = Math.max(0, Math.ceil(remainingMinutes));
    if (minutes > 0) {
      (navigator as any).setAppBadge(minutes).catch(() => {});
    } else {
      // 0 or expired: display empty badge flag or 0
      (navigator as any).setAppBadge(0).catch(() => {});
    }
  } catch {
    // Ignore unsupported browser errors
  }
}

export function clearAppBadge(): void {
  if (typeof navigator === 'undefined' || !('clearAppBadge' in navigator)) return;
  try {
    (navigator as any).clearAppBadge().catch(() => {});
  } catch {
    // Ignore
  }
}
