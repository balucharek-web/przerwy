import { WebhookLog } from '../types';

export const TEAM_SHARED_WEBHOOK = 'https://chat.googleapis.com/v1/spaces/AAAA94ZyILs/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=aoQFsSDKoYcofsyF4Cd1cynnTkNShzZDilpkNcJ4j2c';

const OFFLINE_QUEUE_KEY = 'przerwapro_offline_webhook_queue';
const SENT_EVENTS_KEY = 'przerwapro_sent_webhook_events';
const MAX_QUEUE_AGE_MS = 15 * 60 * 1000; // 15 minut - starsze zaległe wiadomości wygasają automatycznie

const inFlightEventIds = new Set<string>();
let isFlushingQueue = false;

export interface SendWebhookParams {
  webhookUrl?: string;
  userName?: string;
  action: 'start' | 'stop' | 'test';
  breakId?: string;
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

interface QueuedWebhook {
  eventId: string;
  breakId?: string;
  webhookUrl: string;
  messageText: string;
  action: 'start' | 'stop';
  timestamp: string;
}

function getSentEventIds(): string[] {
  try {
    const raw = localStorage.getItem(SENT_EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function hasEventBeenSent(eventId: string): boolean {
  if (!eventId) return false;
  return getSentEventIds().includes(eventId);
}

function markEventAsSent(eventId: string): void {
  if (!eventId) return;
  try {
    const existing = getSentEventIds();
    if (!existing.includes(eventId)) {
      const updated = [...existing, eventId].slice(-40);
      localStorage.setItem(SENT_EVENTS_KEY, JSON.stringify(updated));
    }
  } catch {}
}

/**
 * Usuwa z kolejki przestarzałe wpisy z poprzednich przerw, gdy użytkownik zaczyna nową przerwę.
 * Zapobiega sytuacji, w której po kliknięciu "Start" wyskakuje stara wiadomość "(dosłane z kolejki)"
 * z poprzedniej przerwy tuż przed nową wiadomością.
 */
function clearObsoleteQueueOnNewBreak(currentBreakId?: string): void {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return;
    const queue: QueuedWebhook[] = JSON.parse(raw);
    const now = Date.now();
    const filtered = queue.filter((item) => {
      const age = now - new Date(item.timestamp).getTime();
      if (Number.isNaN(age) || age > MAX_QUEUE_AGE_MS) return false;
      // Usuń stare "start" z poprzednich przerw
      if (item.action === 'start' && item.breakId !== currentBreakId) return false;
      return true;
    });
    if (filtered.length > 0) {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));
    } else {
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
    }
  } catch {}
}

function enqueueOfflineWebhook(item: QueuedWebhook): void {
  try {
    if (hasEventBeenSent(item.eventId)) return;
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue: QueuedWebhook[] = raw ? JSON.parse(raw) : [];
    // Zapobiegaj duplikatom tego samego zdarzenia w kolejce
    if (queue.some((q) => q.eventId === item.eventId)) {
      return;
    }
    const now = Date.now();
    const freshQueue = queue.filter((q) => {
      const age = now - new Date(q.timestamp).getTime();
      return !Number.isNaN(age) && age <= MAX_QUEUE_AGE_MS;
    });
    freshQueue.push(item);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(freshQueue.slice(-10)));
  } catch {}
}

export async function sendGoogleChatWebhook(params: SendWebhookParams): Promise<WebhookLog> {
  const {
    webhookUrl,
    userName = 'Pracownik',
    action,
    breakId,
    currentBreakDurationSeconds = 0,
    totalUsedSecondsToday = 0,
    dailyAllowanceSeconds = 1800,
    simpleChatMessages = true,
    startMessageText = 'start',
    stopMessageText = 'stop',
    includeNameInSimpleMessage = true,
  } = params;

  const eventId =
    action === 'test'
      ? `test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
      : `${breakId || Date.now()}:${action}`;

  // Twarda deduplikacja: ta sama akcja (Start/Stop tej samej przerwy) nigdy nie wyjdzie 2 razy
  if (action !== 'test') {
    if (inFlightEventIds.has(eventId) || hasEventBeenSent(eventId)) {
      return {
        id: Math.random().toString(36).substring(2),
        timestamp: new Date().toISOString(),
        action,
        status: 'success',
        message: 'Wiadomość dla tej przerwy została już wysłana (pominięto duplikat).',
      };
    }
    inFlightEventIds.add(eventId);
  }

  // Gdy rozpoczyna się nowa przerwa, usuń ewentualne stare niewysłane "start" z kolejki
  if (action === 'start') {
    clearObsoleteQueueOnNewBreak(breakId);
  }

  try {
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

    // Jeśli urządzenie w tym momencie nie ma sieci -> od razu dodaj do kolejki (bez zbędnych prób fetch)
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      if (action === 'start' || action === 'stop') {
        enqueueOfflineWebhook({
          eventId,
          breakId,
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
          message: 'Brak zasięgu/internetu. Wiadomość zapisana w kolejce – zostanie wysłana raz po odzyskaniu sieci.',
        };
      }
      return {
        id: Math.random().toString(36).substring(2),
        timestamp: new Date().toISOString(),
        action,
        status: 'error',
        message: 'Brak połączenia z internetem. Nie można wysłać testu.',
      };
    }

    const payloadString = JSON.stringify({ text: messageText });

    // POJEDYNCZA wysyłka bezpośrednia w trybie no-cors z text/plain.
    // Dlaczego tylko ta strategia?
    // 1. application/json zawsze wywołuje preflight OPTIONS odrzucany przez Google Chat (CORS).
    // 2. text/plain w trybie cors wysyłał wiadomość na czat, a potem przeglądarka rzucała błąd CORS
    //    i kod mylnie wysyłał wiadomość DRUGI RAZ w kolejnym kroku!
    // 3. mode: 'no-cors' + text/plain wysyła dokładnie JEDEN request i rozwiązuje się czysto po dostarczeniu.
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

      if (action !== 'test') {
        markEventAsSent(eventId);
      }

      return {
        id: Math.random().toString(36).substring(2),
        timestamp: new Date().toISOString(),
        action,
        status: 'success',
        message: `Wysłano na Google Chat: "${messageText}"`,
      };
    } catch (directErr: any) {
      console.warn('[GoogleChat] Direct no-cors fetch failed:', directErr);
    }

    // Fallback: serwerowy proxy (działa wyłącznie gdy aplikacja ma własny backend Node.js i połączenie z siecią)
    if (typeof navigator === 'undefined' || navigator.onLine !== false) {
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
          if (action !== 'test') {
            markEventAsSent(eventId);
          }
          return {
            id: Math.random().toString(36).substring(2),
            timestamp: new Date().toISOString(),
            action,
            status: 'success',
            message: `Wysłano na Google Chat: "${messageText}"`,
          };
        }
      } catch (proxyErr) {
        console.warn('[GoogleChat] Proxy fallback unavailable/failed:', proxyErr);
      }
    }

    // Jeśli obie próby zawiodły (np. chwilowy zanik sieci dokładnie podczas kliknięcia) -> zapisz w kolejce
    if (action === 'start' || action === 'stop') {
      enqueueOfflineWebhook({
        eventId,
        breakId,
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
        message: 'Chwilowy brak połączenia. Wiadomość zapisana w kolejce – zostanie wysłana automatycznie raz po powrocie sieci.',
      };
    }

    return {
      id: Math.random().toString(36).substring(2),
      timestamp: new Date().toISOString(),
      action,
      status: 'error',
      message: 'Nie udało się wysłać testu na Google Chat. Sprawdź połączenie z internetem.',
    };
  } finally {
    inFlightEventIds.delete(eventId);
  }
}

export async function flushOfflineWebhookQueue(): Promise<number> {
  if (typeof window === 'undefined' || !navigator.onLine || isFlushingQueue) return 0;

  isFlushingQueue = true;
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return 0;

    const queue: QueuedWebhook[] = JSON.parse(raw);
    if (!queue.length) {
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
      return 0;
    }

    // Atomowo przejmij i wyczyść kolejkę PRZED wysłaniem,
    // aby równoległe zdarzenia (np. start aplikacji + zdarzenie online) nigdy nie wysłały tego samego 2 razy
    localStorage.removeItem(OFFLINE_QUEUE_KEY);

    const now = Date.now();
    let delivered = 0;
    const failedToRetry: QueuedWebhook[] = [];

    for (const item of queue) {
      const eventId = item.eventId || `${item.timestamp}:${item.action}`;

      // Pomiń przeterminowane wiadomości (> 15 min) oraz wiadomości już wcześniej dostarczone
      const ageMs = now - new Date(item.timestamp).getTime();
      if (Number.isNaN(ageMs) || ageMs > MAX_QUEUE_AGE_MS || hasEventBeenSent(eventId) || inFlightEventIds.has(eventId)) {
        continue;
      }

      inFlightEventIds.add(eventId);
      try {
        const origTime = new Date(item.timestamp).toLocaleTimeString('pl-PL', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const suffix = ageMs > 45_000 ? ` (dosłane z kolejki, z ${origTime})` : '';
        const payloadString = JSON.stringify({ text: `${item.messageText}${suffix}` });

        // Wyłącznie jedno żądanie mode: 'no-cors' (bez powtarzania cors + no-cors)
        await fetch(item.webhookUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: payloadString,
          keepalive: true,
        });

        markEventAsSent(eventId);
        delivered++;
      } catch {
        failedToRetry.push(item);
      } finally {
        inFlightEventIds.delete(eventId);
      }
    }

    if (failedToRetry.length > 0) {
      for (const failed of failedToRetry) {
        enqueueOfflineWebhook(failed);
      }
    }

    return delivered;
  } catch {
    return 0;
  } finally {
    isFlushingQueue = false;
  }
}
