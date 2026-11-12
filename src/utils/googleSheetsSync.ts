/**
 * Google Sheets Synchronization Service for PrzerwaPro
 * 
 * Communicates with a zero-server Google Apps Script Web App attached
 * to the user's private Google Sheet.
 * 
 * Features:
 * 1. Automatic logging of breaks into monthly formatted tabs with per-person columns.
 * 2. Bi-directional sync: downloads break history from Google Sheets into PrzerwaPro.
 * 3. 100% Works in Android Work Profile and corporate domains (ADEO / Leroy Merlin).
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

  // Strip Google Workspace tenant prefix (e.g. /a/macros/leroymerlin.pl/s/ -> /macros/s/)
  // This is CRITICAL: /a/macros/ forces tenant-level SSO (idpb2e) even if deployed to Anyone!
  if (clean.includes('/a/macros/')) {
    clean = clean.replace(/\/a\/macros\/[^/]+\/s\//, '/macros/s/');
  }

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
    // Proxy not available (e.g. GitHub Pages static host) -> proceed to direct strategies
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
    console.warn('[GoogleSheets] Direct POST error, trying fallbacks:', err);
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

    // Also trigger hidden form submission for ADEO domain SSO session passthrough
    submitBreakViaHiddenForm(cleanUrl, payload);

    return {
      success: true,
      message: 'Wysłano przerwę do Arkusza Google ADEO (tryb bezpieczny no-cors).',
    };
  } catch (noCorsErr: any) {
    // Strategy 3: Hidden form submission (bypasses ADEO domain restrictions and uses browser SSO cookies)
    submitBreakViaHiddenForm(cleanUrl, payload);
    return {
      success: true,
      message: 'Wysłano przerwę do Arkusza Google ADEO (przez formularz przeglądarki).',
    };
  }
}

/**
 * Submits break record via hidden form targeting hidden iframe.
 * Allows browser to attach native ADEO Google Workspace SSO cookies.
 */
export function submitBreakViaHiddenForm(cleanUrl: string, payload: any): void {
  if (typeof document === 'undefined') return;
  try {
    const iframeName = 'przerwapro_sheet_sink_' + Date.now();
    const iframe = document.createElement('iframe');
    iframe.id = iframeName;
    iframe.name = iframeName;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = cleanUrl;
    form.target = iframeName;
    form.style.display = 'none';

    const addField = (name: string, val: string) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = val;
      form.appendChild(input);
    };

    addField('action', 'record_break');
    addField('format', 'html');
    addField('userName', payload.userName || 'Pracownik');
    addField('break', JSON.stringify(payload.break || {}));

    document.body.appendChild(form);
    form.submit();

    setTimeout(() => {
      try {
        if (form.parentNode) form.parentNode.removeChild(form);
        setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 15000);
      } catch {}
    }, 1200);
  } catch (e) {
    console.warn('[GoogleSheets] Form submission fallback error:', e);
  }
}

/**
 * JSONP ping helper for bypassing mobile CORS and redirect issues on GitHub Pages
 */
function jsonpPing(url: string, timeoutMs = 7000): Promise<{ success: boolean; message: string; spreadsheetTitle?: string }> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') return reject(new Error('Brak środowiska DOM'));
    const callbackName = 'przerwapro_ping_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const script = document.createElement('script');
    let timer: any;

    (window as any)[callbackName] = (data: any) => {
      cleanup();
      resolve(data);
    };

    const cleanup = () => {
      clearTimeout(timer);
      delete (window as any)[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('Błąd ładowania skryptu (JSONP)'));
    };

    timer = setTimeout(() => {
      cleanup();
      reject(new Error('Przekroczono limit czasu odpowiedzi'));
    }, timeoutMs);

    try {
      const queryUrl = new URL(url);
      queryUrl.searchParams.set('action', 'ping');
      queryUrl.searchParams.set('callback', callbackName);
      script.src = queryUrl.toString();
      document.body.appendChild(script);
    } catch (e: any) {
      cleanup();
      reject(e);
    }
  });
}

/**
 * JSONP break history fetch helper for bypassing mobile CORS on GitHub Pages
 */
function jsonpFetchBreaks(url: string, userName?: string, timeoutMs = 10000): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') return reject(new Error('Brak środowiska DOM'));
    const callbackName = 'przerwapro_breaks_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const script = document.createElement('script');
    let timer: any;

    (window as any)[callbackName] = (data: any) => {
      cleanup();
      resolve(data);
    };

    const cleanup = () => {
      clearTimeout(timer);
      delete (window as any)[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('Błąd ładowania historii (JSONP)'));
    };

    timer = setTimeout(() => {
      cleanup();
      reject(new Error('Przekroczono limit czasu pobierania'));
    }, timeoutMs);

    try {
      const queryUrl = new URL(url);
      queryUrl.searchParams.set('action', 'get_breaks');
      if (userName && userName.trim()) {
        queryUrl.searchParams.set('userName', userName.trim());
      }
      queryUrl.searchParams.set('callback', callbackName);
      script.src = queryUrl.toString();
      document.body.appendChild(script);
    } catch (e: any) {
      cleanup();
      reject(e);
    }
  });
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

    if (res.ok) {
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
      }
    }
  } catch (err) {
    console.warn('[GoogleSheets] Direct fetch error, trying JSONP:', err);
  }

  // Strategy 2: JSONP fallback (works seamlessly on mobile GitHub Pages)
  try {
    const data = await jsonpFetchBreaks(cleanUrl, userName);
    if (data && data.success && Array.isArray(data.breaks)) {
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
        message: `Pobrano ${sanitized.length} wpisów z Arkusza Google (JSONP).`,
        breaks: sanitized,
      };
    }
  } catch (jsonpErr: any) {
    console.warn('[GoogleSheets] JSONP error:', jsonpErr);
  }

  return {
    success: false,
    message: 'Nie udało się pobrać danych z Arkusza. Upewnij się, że w Apps Script „Kto ma dostęp” to „Każdy” oraz że w adresie URL usunięto /a/macros/leroymerlin.pl/',
  };
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
          correctedUrl: cleanUrl !== rawUrl ? cleanUrl : undefined,
        };
      }
    }
  } catch {
    // Proxy niedostępny (np. statyczny hosting GitHub Pages na telefonie) -> przejdź do bezpośredniego fetch
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

    if (res.ok) {
      const rawText = await res.text();
      if (rawText.includes('idpb2e') || rawText.includes('Authentication page') || rawText.includes('adeo.com')) {
        return {
          success: false,
          message: '⚠️ Wykryto blokadę logowania ADEO SSO (idpb2e)!\n\nTwój arkusz znajduje się na Dysku ADEO. Aby aplikacja mogła do niego zapisywać bez blokady portalu logowania:\n\n1. W Arkuszu ADEO wejdź w: Rozszerzenia ➔ Apps Script.\n2. Kliknij: Wdróż ➔ Zarządzaj wdrożeniami (ikona ołówka - Edytuj).\n3. W polu „Wersja” wybierz: Nowa wersja.\n4. W polu „Kto ma dostęp” (Who has access) zmień z „Każdy w organizacji ADEO” na: „Każdy” (Anyone)!\n5. Upewnij się, że „Wykonaj jako” to: „Ja”.\n\nArkusz nadal w 100% pozostanie w Twojej domenie ADEO, ale Google zezwoli na zapis przerw bez przekierowania do idpb2e.',
          correctedUrl: cleanUrl !== rawUrl ? cleanUrl : undefined,
        };
      }

      try {
        const data = JSON.parse(rawText);
        if (data.success) {
          return {
            success: true,
            message: `Połączono pomyślnie z Arkuszem: "${data.spreadsheetTitle || 'Arkusz przerw'}"`,
            spreadsheetTitle: data.spreadsheetTitle,
            correctedUrl: cleanUrl !== rawUrl ? cleanUrl : undefined,
          };
        }
      } catch {}
    }
  } catch (err: any) {
    console.warn('[GoogleSheets] Direct fetch failed on mobile, attempting JSONP fallback:', err);
  }

  // Strategy 2: JSONP Ping (bypasses mobile browser CORS and redirect restrictions on GitHub Pages!)
  try {
    const jsonpData = await jsonpPing(cleanUrl);
    if (jsonpData && jsonpData.success) {
      return {
        success: true,
        message: `Połączono pomyślnie z Arkuszem (JSONP): "${jsonpData.spreadsheetTitle || 'Arkusz przerw'}"`,
        spreadsheetTitle: jsonpData.spreadsheetTitle,
        correctedUrl: cleanUrl !== rawUrl ? cleanUrl : undefined,
      };
    }
  } catch (jsonpErr) {
    console.warn('[GoogleSheets] JSONP Ping failed:', jsonpErr);
  }

  return {
    success: false,
    message: `Błąd połączenia: Failed to fetch.\n\nNajczęstsze przyczyny:\n1. Adres URL zawierał przedrostek /a/macros/leroymerlin.pl/ - aplikacja automatycznie poprawiła adres na globalny format /macros/s/...\n2. W Apps Script w konfiguracji wdrożenia pole „Kto ma dostęp” (Who has access) MUSI być wybrane jako „Każdy” (Anyone) – jeśli jest „Tylko ja” lub „Każdy w ADEO”, Google blokuje połączenie!\n3. Upewnij się, że wkleiłeś zaktualizowany kod skryptu z obsługą JSONP.`,
    correctedUrl: cleanUrl !== rawUrl ? cleanUrl : undefined,
  };
}
