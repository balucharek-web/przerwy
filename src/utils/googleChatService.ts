import { WebhookLog } from '../types';

export interface SendWebhookParams {
  webhookUrl: string;
  userName?: string;
  action: 'start' | 'stop' | 'test';
  breakStartTime?: string;
  breakEndTime?: string;
  currentBreakDurationSeconds?: number;
  totalUsedSecondsToday: number;
  dailyAllowanceSeconds: number;
  simpleChatMessages?: boolean;
  startMessageText?: string;
  stopMessageText?: string;
}

export async function sendGoogleChatWebhook(params: SendWebhookParams): Promise<WebhookLog> {
  const {
    webhookUrl,
    userName = 'Pracownik',
    action,
    currentBreakDurationSeconds = 0,
    totalUsedSecondsToday,
    dailyAllowanceSeconds,
    simpleChatMessages = true,
    startMessageText = 'start',
    stopMessageText = 'stop',
  } = params;

  if (!webhookUrl || !webhookUrl.trim()) {
    return {
      id: Math.random().toString(36).substring(2),
      timestamp: new Date().toISOString(),
      action,
      status: 'error',
      message: 'Brak skonfigurowanego adresu URL webhooka Google Chat.',
    };
  }

  const remainingSeconds = dailyAllowanceSeconds - totalUsedSecondsToday;
  const usedMinutes = Math.floor(totalUsedSecondsToday / 60);
  const usedSeconds = totalUsedSecondsToday % 60;
  const allowMinutes = Math.floor(dailyAllowanceSeconds / 60);

  const timeStr = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = new Date().toLocaleDateString('pl-PL');

  let messageText = '';

  if (action === 'test') {
    messageText = `🔔 *Test webhooka PrzerwaPro*\n👤 Użytkownik: *${userName}*\n✅ Webhook działa poprawnie!\n🕒 Czas: ${timeStr} | ${dateStr}`;
  } else if (simpleChatMessages) {
    // Exact user requirement: "gdy klikam start to ma się wysyłać start na chacie a gdy stop to ma się wysyłać stop"
    if (action === 'start') {
      messageText = (startMessageText && startMessageText.trim()) || 'start';
    } else if (action === 'stop') {
      messageText = (stopMessageText && stopMessageText.trim()) || 'stop';
    }
  } else {
    // Full report mode
    if (action === 'start') {
      const remMinutes = Math.max(0, Math.floor(remainingSeconds / 60));
      const remSeconds = Math.max(0, remainingSeconds % 60);

      messageText = `☕ *${userName} rozpoczął przerwę*\n` +
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

      messageText = `${statusEmoji} *${userName} zakończył przerwę*\n` +
        `🕒 Czas: *${timeStr}*\n` +
        `⏱️ Czas trwania tej przerwy: *${durationMin}m ${durationSec}s*\n` +
        `📊 Łącznie dzisiaj: *${usedMinutes}m ${usedSeconds}s* / *${allowMinutes}m 00s*\n` +
        `⏳ Pozostały limit: *${!isOver ? `${remMinutes}m ${remSeconds}s` : `PRZEKROCZONO o ${Math.abs(Math.floor(remainingSeconds / 60))}m ${Math.abs(remainingSeconds % 60)}s!`}*`;
    }
  }

  // First try backend proxy (to cleanly bypass browser CORS when running locally or on server)
  try {
    const res = await fetch('/api/webhook/google-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhookUrl: webhookUrl.trim(),
        text: messageText,
      }),
    });

    if (res.ok) {
      return {
        id: Math.random().toString(36).substring(2),
        timestamp: new Date().toISOString(),
        action,
        status: 'success',
        message: `Wysłano na Google Chat: "${messageText}"`,
      };
    } else {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${res.status}`);
    }
  } catch (proxyError: any) {
    // If backend proxy failed (e.g. static hosting on GitHub Pages), attempt direct fetch in no-cors mode
    try {
      await fetch(webhookUrl.trim(), {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({ text: messageText }),
      });

      return {
        id: Math.random().toString(36).substring(2),
        timestamp: new Date().toISOString(),
        action,
        status: 'success',
        message: `Wysłano na Google Chat: "${messageText}"`,
      };
    } catch (directError: any) {
      return {
        id: Math.random().toString(36).substring(2),
        timestamp: new Date().toISOString(),
        action,
        status: 'error',
        message: `Błąd wysyłania: ${proxyError.message || directError.message || 'Nieznany błąd'}`,
      };
    }
  }
}
