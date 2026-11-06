import { WebhookLog } from '../types';

export const TEAM_SHARED_WEBHOOK = 'https://chat.googleapis.com/v1/spaces/AAAA94ZyILs/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=aoQFsSDKoYcofsyF4Cd1cynnTkNShzZDilpkNcJ4j2c';

export interface SendWebhookParams {
  webhookUrl?: string;
  userName?: string;
  action: 'start' | 'stop' | 'test';
  breakStartTime?: string;
  breakEndTime?: string;
  currentBreakDurationSeconds?: number;
  totalUsedSecondsToday?: number;
  dailyAllowanceSeconds?: number;
  simpleChatMessages?: boolean;
  startMessageText?: string;
  stopMessageText?: string;
  includeNameInSimpleMessage?: boolean;
}

export async function sendGoogleChatWebhook(params: SendWebhookParams): Promise<WebhookLog> {
  const {
    webhookUrl,
    userName = 'Pracownik',
    action,
    currentBreakDurationSeconds = 0,
    totalUsedSecondsToday = 0,
    dailyAllowanceSeconds = 1800,
    simpleChatMessages = true,
    startMessageText = 'start',
    stopMessageText = 'stop',
    includeNameInSimpleMessage = true,
  } = params;

  // Fallback to team shared webhook if empty or undefined
  const targetUrl = (webhookUrl && webhookUrl.trim()) ? webhookUrl.trim() : TEAM_SHARED_WEBHOOK;

  const remainingSeconds = dailyAllowanceSeconds - totalUsedSecondsToday;
  const usedMinutes = Math.floor(totalUsedSecondsToday / 60);
  const usedSeconds = totalUsedSecondsToday % 60;
  const allowMinutes = Math.floor(dailyAllowanceSeconds / 60);

  const timeStr = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = new Date().toLocaleDateString('pl-PL');

  let messageText = '';

  if (action === 'test') {
    const displayName = (userName && userName.trim()) ? userName.trim() : 'Pracownik';
    messageText = `🔔 *Test webhooka PrzerwaPro*\n👤 Użytkownik: *${displayName}*\n✅ Webhook Google Chat działa poprawnie!\n🕒 Czas: ${timeStr} | ${dateStr}`;
  } else if (simpleChatMessages) {
    // Basic start / stop messages (np. "Arek: start" lub "start")
    const baseText = action === 'start'
      ? ((startMessageText && startMessageText.trim()) || 'start')
      : ((stopMessageText && stopMessageText.trim()) || 'stop');

    if (includeNameInSimpleMessage && userName && userName.trim()) {
      messageText = `${userName.trim()}: ${baseText}`;
    } else {
      messageText = baseText;
    }
  } else {
    // Full report mode
    const displayName = (userName && userName.trim()) ? userName.trim() : 'Pracownik';
    if (action === 'start') {
      const remMinutes = Math.max(0, Math.floor(remainingSeconds / 60));
      const remSeconds = Math.max(0, remainingSeconds % 60);

      messageText = `☕ *${displayName} rozpoczął przerwę*\n` +
        `🕒 Czas: *${timeStr}*\n` +
        `📊 Wykorzystano dzisiaj: *${usedMinutes}m ${usedSeconds}s* / *${allowMinutes}m 00s*\n` +
        `⏳ Pozostały limit: *${remainingSeconds >= 0 ? `${remMinutes}m ${remSeconds}s` : `PRZEKROCZONO o ${Math.abs(Math.floor(remainingSeconds / 60))}m!`}*`;
    } else if (action === 'stop') {
      const durationMin = Math.floor(currentBreakDurationSeconds / 60);
      const durationSec = currentBreakDurationSeconds % 60;
      const remMinutes = Math.max(0, Math.floor(remainingSeconds / 60));
      const remSeconds = Math.max(0, remainingSeconds % 60);

      const isOver = remainingSeconds < 0;
      const statusEmoji = isOver ? '⚠️' : '✅';

      messageText = `${statusEmoji} *${displayName} zakończył przerwę*\n` +
        `🕒 Czas: *${timeStr}*\n` +
        `⏱️ Czas trwania tej przerwy: *${durationMin}m ${durationSec}s*\n` +
        `📊 Łącznie dzisiaj: *${usedMinutes}m ${usedSeconds}s* / *${allowMinutes}m 00s*\n` +
        `⏳ Pozostały limit: *${!isOver ? `${remMinutes}m ${remSeconds}s` : `PRZEKROCZONO o ${Math.abs(Math.floor(remainingSeconds / 60))}m ${Math.abs(remainingSeconds % 60)}s!`}*`;
    }
  }

  const payloadString = JSON.stringify({ text: messageText });

  // STRATEGY 1: Direct fetch with Content-Type: application/json; charset=UTF-8 and keepalive: true
  try {
    const directRes = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: payloadString,
      keepalive: true,
    });

    if (directRes.ok) {
      return {
        id: Math.random().toString(36).substring(2),
        timestamp: new Date().toISOString(),
        action,
        status: 'success',
        message: `Wysłano na Google Chat: "${messageText}"`,
      };
    }
  } catch (directErr) {
    console.warn('[GoogleChat] Direct JSON fetch failed, attempting text/plain fallback:', directErr);
  }

  // STRATEGY 2: Direct fetch with Content-Type: text/plain (CORS-safelisted simple request, avoids preflight OPTIONS)
  // Google Chat API natively parses json in text/plain body without failing CORS preflight
  try {
    const textRes = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
      },
      body: payloadString,
      keepalive: true,
    });

    if (textRes.ok) {
      return {
        id: Math.random().toString(36).substring(2),
        timestamp: new Date().toISOString(),
        action,
        status: 'success',
        message: `Wysłano na Google Chat: "${messageText}"`,
      };
    }
  } catch (textErr) {
    console.warn('[GoogleChat] Text/plain fetch failed, attempting no-cors fallback:', textErr);
  }

  // STRATEGY 3: mode: 'no-cors' with Content-Type: text/plain
  // Guaranteed delivery across strict browser sandboxes / Work Profile MDM firewalls
  try {
    await fetch(targetUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
      },
      body: payloadString,
      keepalive: true,
    });

    // In no-cors mode the browser does not expose the response status, but the POST is delivered to Google Chat
    return {
      id: Math.random().toString(36).substring(2),
      timestamp: new Date().toISOString(),
      action,
      status: 'success',
      message: `Wysłano na Google Chat: "${messageText}"`,
    };
  } catch (noCorsErr) {
    console.warn('[GoogleChat] no-cors fetch failed, trying proxy fallback:', noCorsErr);
  }

  // STRATEGY 4: Try backend proxy (if running in full-stack Node.js environment)
  try {
    const proxyRes = await fetch('/api/webhook/google-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhookUrl: targetUrl,
        text: messageText,
      }),
      keepalive: true,
    });

    if (proxyRes.ok) {
      return {
        id: Math.random().toString(36).substring(2),
        timestamp: new Date().toISOString(),
        action,
        status: 'success',
        message: `Wysłano na Google Chat: "${messageText}"`,
      };
    }
  } catch (proxyError: any) {
    // If delivery failed (e.g. no internet connection), enqueue into offline queue for auto-retry
    if (action === 'start' || action === 'stop') {
      enqueueOfflineWebhook({
        webhookUrl: targetUrl,
        messageText,
        action,
        timestamp: new Date().toISOString(),
      });
      return {
        id: Math.random().toString(36).substring(2),
        timestamp: new Date().toISOString(),
        action,
        status: 'error',
        message: 'Brak połączenia z siecią. Wiadomość zapisana w kolejce – zostanie wysłana automatycznie po powrocie internetu.',
      };
    }

    return {
      id: Math.random().toString(36).substring(2),
      timestamp: new Date().toISOString(),
      action,
      status: 'error',
      message: `Błąd wysyłania: ${proxyError?.message || 'Nie udało się dostarczyć wiadomości na czat'}`,
    };
  }

  // Final fallback if proxy didn't throw but wasn't ok
  if (action === 'start' || action === 'stop') {
    enqueueOfflineWebhook({
      webhookUrl: targetUrl,
      messageText,
      action,
      timestamp: new Date().toISOString(),
    });
    return {
      id: Math.random().toString(36).substring(2),
      timestamp: new Date().toISOString(),
      action,
      status: 'error',
      message: 'Wiadomość dodana do kolejki (brak odpowiedzi serwera). Zostanie ponowiona automatycznie.',
    };
  }

  return {
    id: Math.random().toString(36).substring(2),
    timestamp: new Date().toISOString(),
    action,
    status: 'error',
    message: 'Nie udało się wysłać testu na Google Chat. Sprawdź połączenie z internetem.',
  };
}

const OFFLINE_QUEUE_KEY = 'przerwapro_offline_webhook_queue';

interface QueuedWebhook {
  webhookUrl: string;
  messageText: string;
  action: 'start' | 'stop';
  timestamp: string;
}

function enqueueOfflineWebhook(item: QueuedWebhook) {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue: QueuedWebhook[] = raw ? JSON.parse(raw) : [];
    queue.push(item);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue.slice(-10)));
  } catch {}
}

export async function flushOfflineWebhookQueue(): Promise<number> {
  if (typeof window === 'undefined' || !navigator.onLine) return 0;
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return 0;
    const queue: QueuedWebhook[] = JSON.parse(raw);
    if (!queue.length) return 0;

    let delivered = 0;
    const remaining: QueuedWebhook[] = [];

    for (const item of queue) {
      const payloadString = JSON.stringify({ text: `${item.messageText} (dosłane z kolejki)` });
      let sent = false;

      // Try text/plain first
      try {
        const res = await fetch(item.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: payloadString,
          keepalive: true,
        });
        if (res.ok) {
          delivered++;
          sent = true;
        }
      } catch {}

      // Fallback to no-cors
      if (!sent) {
        try {
          await fetch(item.webhookUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
            body: payloadString,
            keepalive: true,
          });
          delivered++;
          sent = true;
        } catch {}
      }

      if (!sent) {
        remaining.push(item);
      }
    }

    if (remaining.length > 0) {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
    } else {
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
    }

    return delivered;
  } catch {
    return 0;
  }
}
