/**
 * Date and time utilities with custom reset-hour support for shift work
 */

export function parseResetHour(resetHourStr: string = '00:00'): { hours: number; minutes: number } {
  const parts = resetHourStr.split(':');
  const hours = parseInt(parts[0] || '0', 10);
  const minutes = parseInt(parts[1] || '0', 10);
  return {
    hours: isNaN(hours) ? 0 : Math.max(0, Math.min(23, hours)),
    minutes: isNaN(minutes) ? 0 : Math.max(0, Math.min(59, minutes)),
  };
}

/**
 * Returns the effective YYYY-MM-DD day key for any timestamp, taking into account
 * the daily reset hour cutoff.
 * 
 * Example: If resetHour is 06:00, then 2026-10-16 at 04:00 AM belongs to dayKey 2026-10-15.
 */
export function getDayKey(dateInput: Date | string | number, resetHourStr: string = '00:00'): string {
  const date = new Date(dateInput);
  const { hours: resetH, minutes: resetM } = parseResetHour(resetHourStr);

  const resetMinutesToday = resetH * 60 + resetM;
  const currentMinutesToday = date.getHours() * 60 + date.getMinutes();

  const effectiveDate = new Date(date);

  // If current time is before the reset hour, this belongs to previous day's shift
  if (currentMinutesToday < resetMinutesToday) {
    effectiveDate.setDate(effectiveDate.getDate() - 1);
  }

  const y = effectiveDate.getFullYear();
  const m = String(effectiveDate.getMonth() + 1).padStart(2, '0');
  const d = String(effectiveDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format seconds into mm:ss or hh:mm:ss
 */
export function formatDuration(totalSeconds: number, includeHours: boolean = false): string {
  const isNegative = totalSeconds < 0;
  const absSeconds = Math.abs(Math.round(totalSeconds));

  const hours = Math.floor(absSeconds / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);
  const seconds = absSeconds % 60;

  const prefix = isNegative ? '-' : '';

  if (hours > 0 || includeHours) {
    return `${prefix}${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${prefix}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatDurationHuman(totalSeconds: number): string {
  const absSeconds = Math.abs(Math.round(totalSeconds));
  const hours = Math.floor(absSeconds / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);
  const seconds = absSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function formatTimeOnly(dateInput: string | Date): string {
  const date = new Date(dateInput);
  return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatShortTime(dateInput: string | Date): string {
  const date = new Date(dateInput);
  return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateLabel(dayKey: string): string {
  const [year, month, day] = dayKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
