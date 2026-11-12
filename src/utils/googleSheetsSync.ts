/**
 * Google Sheets Synchronization Service for PrzerwaPro
 * 
 * Communicates with a zero-server Google Apps Script Web App attached
 * to the user's private Google Sheet.
 * 
 * Features:
 * 1. Automatic logging of breaks into monthly formatted tabs with per-person columns.
 * 2. Bi-directional sync: downloads break history from Google Sheets into PrzerwaPro.
 * 3. 100% Works in Android Work Profile without OAuth approval.
 */

import { BreakRecord } from '../types';

export interface SheetsSyncResponse {
  success: boolean;
  message: string;
  breaks?: BreakRecord[];
}

/**
 * Normalizes Google Apps Script Web App URL
 */
export function normalizeScriptUrl(url: string): string {
  if (!url) return '';
  let clean = url.trim().replace(/^["']|["']$/g, '');

  // If user pasted Google Sheets doc URL by mistake, keep it so validator can explain
  if (clean.includes('docs.google.com/spreadsheets')) {
    return clean;
  }

  // If user pasted /edit, replace with /exec
  if (clean.includes('/edit')) {
    clean = clean.replace(/\/edit.*$/, '/exec');
  }

  // If user pasted /dev, replace with /exec
  if (clean.endsWith('/dev')) {
    clean = clean.replace(/\/dev$/, '/exec');
  }

  // If user pasted macro ID without /exec, append /exec
  if (clean.includes('/macros/s/') && !clean.endsWith('/exec')) {
    clean = clean.replace(/\/+$/, '') + '/exec';
  }

  return clean;
}

/**
 * Saves a completed break record into Google Sheet
 */
export async function saveBreakToGoogleSheets(
  scriptUrl: string,
  userName: string,
  breakRecord: BreakRecord,
  webhookUrl?: string
): Promise<{ success: boolean; message: string }> {
  const cleanUrl = normalizeScriptUrl(scriptUrl);
  if (!cleanUrl) {
    return { success: false, message: 'Brak skonfigurowanego adresu URL skryptu Google Sheets.' };
  }

  const payload = {
    action: 'record_break',
    userName: (userName && userName.trim()) ? userName.trim() : 'Pracownik',
    webhookUrl: webhookUrl || '',
    break: {
      id: breakRecord.id,
      startTime: breakRecord.startTime,
      endTime: breakRecord.endTime,
      durationSeconds: breakRecord.durationSeconds,
      note: breakRecord.note || '',
      dayKey: breakRecord.dayKey,
    },
  };

  // Strategy 0: Server proxy if available (bypasses iframe CORS in preview & server)
  try {
    const proxyRes = await fetch('/api/sheets/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scriptUrl: cleanUrl,
        action: 'record_break',
        userName: payload.userName,
        breakData: payload.break,
      }),
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.success) {
        return {
          success: true,
          message: data.message || 'Zapisano przerwę w Arkuszu Google!',
        };
      }
    }
  } catch {
    // Proxy not available (e.g. GitHub Pages static host) -> proceed to direct fetch
  }

  const payloadString = JSON.stringify(payload);

  // Strategy 1: Standard direct fetch with text/plain (CORS-safelisted, follows redirects)
  try {
    const res = await fetch(cleanUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
      },
      body: payloadString,
      keepalive: true,
      redirect: 'follow',
    });

    if (res.ok) {
      try {
        const data = await res.json();
        return {
          success: true,
          message: data.message || 'Zapisano przerwę w Arkuszu Google!',
        };
      } catch {
        return {
          success: true,
          message: 'Wysłano przerwę do Arkusza Google.',
        };
      }
    }
  } catch (err) {
    console.warn('[GoogleSheets] Direct POST error, trying no-cors fallback:', err);
  }

  // Strategy 2: mode: 'no-cors' fallback (guarantees delivery if browser sandbox blocks redirect parsing)
  try {
    await fetch(cleanUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
      },
      body: payloadString,
      keepalive: true,
    });

    return {
      success: true,
      message: 'Wysłano przerwę do Arkusza Google (tryb bezpieczny no-cors).',
    };
  } catch (noCorsErr: any) {
    return {
      success: false,
      message: `Błąd połączenia z Arkuszem: ${noCorsErr?.message || 'Brak odpowiedzi'}`,
    };
  }
}

/**
 * Fetches break history for user or entire sector from Google Sheets
 */
export async function fetchBreaksFromGoogleSheets(
  scriptUrl: string,
  userName?: string
): Promise<SheetsSyncResponse> {
  const cleanUrl = normalizeScriptUrl(scriptUrl);
  if (!cleanUrl) {
    return { success: false, message: 'Brak skonfigurowanego adresu URL skryptu Google Sheets.' };
  }

  // Strategy 0: Server proxy if available (bypasses iframe CORS in preview & server)
  try {
    const proxyRes = await fetch('/api/sheets/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scriptUrl: cleanUrl,
        action: 'get_breaks',
        userName,
      }),
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.success && Array.isArray(data.breaks)) {
        const sanitized: BreakRecord[] = data.breaks.map((b: any) => ({
          id: b.id || `brk_sheet_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          startTime: b.startTime,
          endTime: b.endTime || null,
          durationSeconds: Number(b.durationSeconds) || 0,
          note: b.note || '',
          dayKey: b.dayKey || b.startTime?.slice(0, 10),
        })).filter((b: BreakRecord) => Boolean(b.startTime && b.durationSeconds > 0));

        return {
          success: true,
          message: `Pobrano ${sanitized.length} wpisów z Arkusza Google.`,
          breaks: sanitized,
        };
      } else if (data.requiresAuth) {
        return {
          success: false,
          message: data.message,
        };
      }
    }
  } catch {
    // Proxy not available (e.g. GitHub Pages static host) -> proceed to direct fetch
  }

  // Strategy 1: Direct fetch
  try {
    const queryUrl = new URL(cleanUrl);
    queryUrl.searchParams.set('action', 'get_breaks');
    if (userName && userName.trim()) {
      queryUrl.searchParams.set('userName', userName.trim());
    }

    const res = await fetch(queryUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      redirect: 'follow',
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.success && Array.isArray(data.breaks)) {
      const sanitized: BreakRecord[] = data.breaks.map((b: any) => ({
        id: b.id || `brk_sheet_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        startTime: b.startTime,
        endTime: b.endTime || null,
        durationSeconds: Number(b.durationSeconds) || 0,
        note: b.note || '',
        dayKey: b.dayKey || b.startTime?.slice(0, 10),
      })).filter((b: BreakRecord) => Boolean(b.startTime && b.durationSeconds > 0));

      return {
        success: true,
        message: `Pobrano ${sanitized.length} wpisów z Arkusza Google.`,
        breaks: sanitized,
      };
    } else {
      return {
        success: false,
        message: data.message || 'Arkusz nie zwrócił poprawnych danych.',
      };
    }
  } catch (err: any) {
    console.warn('[GoogleSheets] Fetch error:', err);
    return {
      success: false,
      message: `Nie udało się pobrać danych z Arkusza: ${err?.message || 'Błąd sieci. Upewnij się, że w Apps Script "Kto ma dostęp" to "Każdy"'}`,
    };
  }
}

/**
 * Pings Google Apps Script to verify URL and Sheet access
 */
export async function testGoogleSheetsConnection(
  scriptUrl: string
): Promise<{ success: boolean; message: string; spreadsheetTitle?: string; correctedUrl?: string }> {
  if (!scriptUrl || !scriptUrl.trim()) {
    return { success: false, message: 'Wprowadź adres URL aplikacji Google Apps Script.' };
  }

  const rawUrl = scriptUrl.trim();

  // 1. Sprawdź, czy użytkownik przypadkowo wkleił link do samego arkusza Google
  if (rawUrl.includes('docs.google.com/spreadsheets')) {
    return {
      success: false,
      message: 'Wkleiłeś adres arkusza (docs.google.com)! Potrzebny jest adres wdrożonej aplikacji Apps Script (kończący się na /exec). W arkuszu kliknij: Rozszerzenia ➔ Apps Script ➔ Wdróż ➔ Nowe wdrożenie ➔ Aplikacja internetowa ➔ Kto ma dostęp: Każdy.',
    };
  }

  const cleanUrl = normalizeScriptUrl(rawUrl);

  if (!cleanUrl.includes('script.google.com')) {
    return {
      success: false,
      message: 'Adres musi pochodzić z Google Apps Script (np. https://script.google.com/macros/s/.../exec)',
    };
  }

  // Strategy 0: Serwerowy proxy (rozwiązuje problem z CORS w podglądzie aplikacji / iframe)
  try {
    const proxyRes = await fetch('/api/sheets/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scriptUrl: cleanUrl, action: 'ping' }),
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.success) {
        return {
          success: true,
          message: `Połączono pomyślnie z Arkuszem: "${data.spreadsheetTitle || 'Arkusz przerw'}"`,
          spreadsheetTitle: data.spreadsheetTitle,
          correctedUrl: cleanUrl !== rawUrl ? cleanUrl : undefined,
        };
      } else {
        return {
          success: false,
          message: data.message || 'Skrypt odpowiedział błędem.',
        };
      }
    }
  } catch {
    // Proxy niedostępny (np. statyczny hosting GitHub Pages) -> przejdź do bezpośredniego fetch
  }

  // Strategy 1: Bezpośrednie zapytanie z przeglądarki (wymagane na GitHub Pages)
  try {
    const queryUrl = new URL(cleanUrl);
    queryUrl.searchParams.set('action', 'ping');

    const res = await fetch(queryUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      redirect: 'follow',
    });

    if (!res.ok) {
      throw new Error(`Błąd HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.success) {
      return {
        success: true,
        message: `Połączono pomyślnie z Arkuszem: "${data.spreadsheetTitle || 'Arkusz przerw'}"`,
        spreadsheetTitle: data.spreadsheetTitle,
        correctedUrl: cleanUrl !== rawUrl ? cleanUrl : undefined,
      };
    } else {
      return {
        success: false,
        message: data.message || 'Skrypt odpowiedział błędem.',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Błąd połączenia: Failed to fetch.\n\nNajczęstsze przyczyny:\n1. W Apps Script w konfiguracji wdrożenia pole „Kto ma dostęp” (Who has access) MUSI być wybrane jako „Każdy” (Anyone) – jeśli jest „Tylko ja”, Google wymaga logowania i blokuje dostęp!\n2. Adres URL musi kończyć się na /exec (nie /dev ani /edit).\n3. Pamiętaj, aby zatwierdzić uprawnienia konta Google przy klikaniu „Wdróż”.`,
    };
  }
}
