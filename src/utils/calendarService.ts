/**
 * Android Calendar Integration Service for PrzerwaPro
 * 
 * Safely adds breaks to the standard Android / Google Calendar
 * without requiring Google OAuth, without 3rd-party servers,
 * 100% compatible with corporate Work Profiles (Leroy Merlin) and GDPR / RODO.
 */

import { BreakRecord } from '../types';

interface CalendarEventData {
  title: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  description?: string;
  location?: string;
}

/**
 * Formats a Date object to UTC string required by iCalendar and Google Calendar (YYYYMMDDTHHMMSSZ)
 */
function formatToICSDate(dateStr: string): string {
  const d = new Date(dateStr);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

/**
 * Builds Google Calendar web template URL (standard Android intent catch target)
 */
export function buildGoogleCalendarUrl(event: CalendarEventData): string {
  const dates = `${formatToICSDate(event.startTime)}/${formatToICSDate(event.endTime)}`;
  const title = encodeURIComponent(event.title);
  const details = encodeURIComponent(event.description || 'Zarejestrowano w PrzerwaPro');
  const location = encodeURIComponent(event.location || 'Leroy Merlin');
  
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
}

/**
 * Builds standard iCalendar (.ics) format string
 */
export function generateICSContent(events: CalendarEventData[]): string {
  const now = formatToICSDate(new Date().toISOString());
  
  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PrzerwaPro//Kalendarz Androida//PL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  events.forEach((ev, idx) => {
    const uid = `przerwapro-${Date.now()}-${idx}@przerwapro.local`;
    ics.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${formatToICSDate(ev.startTime)}`,
      `DTEND:${formatToICSDate(ev.endTime)}`,
      `SUMMARY:${ev.title}`,
      `DESCRIPTION:${(ev.description || 'Przerwa w pracy').replace(/\n/g, '\\n')}`,
      `LOCATION:${ev.location || 'Praca'}`,
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'END:VEVENT'
    );
  });

  ics.push('END:VCALENDAR');
  return ics.join('\r\n');
}

/**
 * Adds a single completed break to Android Calendar
 * Opens Android's native Calendar event creation interface
 */
export function addBreakToAndroidCalendar(
  breakRecord: BreakRecord,
  userName?: string
): void {
  const startTime = breakRecord.startTime;
  const endTime = breakRecord.endTime || new Date(new Date(startTime).getTime() + breakRecord.durationSeconds * 1000).toISOString();
  const minutes = Math.max(1, Math.round(breakRecord.durationSeconds / 60));
  
  const title = `☕ Przerwa (${minutes} min)`;
  const description = `Przerwa w pracy zarejestrowana w PrzerwaPro.\nPracownik: ${userName || 'Pracownik'}\nCzas trwania: ${minutes} min\nID wpisu: ${breakRecord.id}`;

  const event: CalendarEventData = {
    title,
    startTime,
    endTime,
    description,
    location: 'Leroy Merlin',
  };

  // Open calendar render URL (captured by Android Calendar app on phones)
  const url = buildGoogleCalendarUrl(event);
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  
  // Fallback if popup blocker intercepted
  if (!win || win.closed || typeof win.closed === 'undefined') {
    window.location.href = url;
  }
}

/**
 * Exports multiple breaks (e.g. today's summary or selected day) as a downloadable .ics file
 * which opens in the phone's native Calendar app with all entries
 */
export function exportBreaksToICSFile(
  breaks: BreakRecord[],
  fileName: string = 'przerwy_kalendarz.ics',
  userName?: string
): void {
  if (breaks.length === 0) return;

  const events: CalendarEventData[] = breaks.map((b) => {
    const startTime = b.startTime;
    const endTime = b.endTime || new Date(new Date(startTime).getTime() + b.durationSeconds * 1000).toISOString();
    const minutes = Math.max(1, Math.round(b.durationSeconds / 60));
    return {
      title: `☕ Przerwa (${minutes} min)`,
      startTime,
      endTime,
      description: `Przerwa w pracy zarejestrowana w PrzerwaPro.\nPracownik: ${userName || 'Pracownik'}\nNotatka: ${b.note || 'brak'}`,
      location: 'Leroy Merlin',
    };
  });

  const icsText = generateICSContent(events);
  const blob = new Blob([icsText], { type: 'text/calendar;charset=utf-8' });
  const downloadUrl = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}
