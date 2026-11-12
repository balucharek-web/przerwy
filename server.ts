import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import webpush from 'web-push';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);
const PORT = 3000;

app.use(express.json());

// Initialize VAPID Keys for Web Push
let vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidPath = path.resolve(__dirname, '.vapid.json');

if (!vapidPublicKey || !vapidPrivateKey) {
  if (fs.existsSync(vapidPath)) {
    try {
      const saved = JSON.parse(fs.readFileSync(vapidPath, 'utf-8'));
      vapidPublicKey = saved.publicKey;
      vapidPrivateKey = saved.privateKey;
    } catch (e) {
      // Ignore
    }
  }
  if (!vapidPublicKey || !vapidPrivateKey) {
    const keys = webpush.generateVAPIDKeys();
    vapidPublicKey = keys.publicKey;
    vapidPrivateKey = keys.privateKey;
    try {
      fs.writeFileSync(vapidPath, JSON.stringify(keys, null, 2));
    } catch (e) {
      // Ignore
    }
  }
}

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:marciniakk018@gmail.com',
  vapidPublicKey!,
  vapidPrivateKey!
);

// Map to keep track of active scheduled push notifications
interface ScheduledJob {
  warningTimer?: NodeJS.Timeout;
  limitTimer?: NodeJS.Timeout;
}
const scheduledJobs = new Map<string, ScheduledJob>();

// Public key endpoint for client subscriptions
app.get('/api/push/public-key', (_req, res) => {
  res.json({ success: true, publicKey: vapidPublicKey });
});

// Schedule push alarm for ongoing break
app.post('/api/push/schedule', (req, res) => {
  const { subscription, warningTimeMs, limitTimeMs, warningMinutes = 3, allowanceMinutes = 30 } = req.body;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ success: false, error: 'Brak prawidłowej subskrypcji Web Push.' });
  }

  const endpoint = subscription.endpoint;

  // Clear existing job for this client if any
  const existingJob = scheduledJobs.get(endpoint);
  if (existingJob) {
    if (existingJob.warningTimer) clearTimeout(existingJob.warningTimer);
    if (existingJob.limitTimer) clearTimeout(existingJob.limitTimer);
    scheduledJobs.delete(endpoint);
  }

  const now = Date.now();
  const warningDelay = Math.max(0, (warningTimeMs || 0) - now);
  const limitDelay = Math.max(0, (limitTimeMs || 0) - now);

  const job: ScheduledJob = {};

  if (warningTimeMs && warningDelay > 0) {
    job.warningTimer = setTimeout(async () => {
      try {
        await webpush.sendNotification(
          subscription,
          JSON.stringify({
            title: '⚠️ Zbliża się koniec przerwy!',
            body: `Zostały ${warningMinutes} minuty z limitu przerwy (${allowanceMinutes} min). Czas wracać!`,
            tag: 'break-warning-push',
            vibrate: [400, 150, 400, 150, 600],
            icon: '/pwa-192x192.png',
            badge: '/icon.svg',
            data: { url: '/?mode=widget' },
          })
        );
      } catch (err: any) {
        console.warn('[WebPush] Błąd wysyłania ostrzeżenia:', err.message);
      }
    }, warningDelay);
  }

  if (limitTimeMs && limitDelay > 0) {
    job.limitTimer = setTimeout(async () => {
      try {
        await webpush.sendNotification(
          subscription,
          JSON.stringify({
            title: '⏰ Limit przerwy wykorzystany!',
            body: `Twój limit ${allowanceMinutes} minut na dzisiaj właśnie się skończył. Wracaj do stanowiska!`,
            tag: 'break-limit-push',
            vibrate: [1000, 300, 1000, 300, 1500],
            icon: '/pwa-192x192.png',
            badge: '/icon.svg',
            data: { url: '/?mode=widget' },
          })
        );
      } catch (err: any) {
        console.warn('[WebPush] Błąd wysyłania limitu:', err.message);
      }
    }, limitDelay);
  }

  scheduledJobs.set(endpoint, job);
  res.json({
    success: true,
    warningScheduledInSec: Math.round(warningDelay / 1000),
    limitScheduledInSec: Math.round(limitDelay / 1000),
  });
});

// Cancel scheduled push alarm when user stops break early
app.post('/api/push/cancel', (req, res) => {
  const { endpoint } = req.body;
  if (endpoint && scheduledJobs.has(endpoint)) {
    const job = scheduledJobs.get(endpoint)!;
    if (job.warningTimer) clearTimeout(job.warningTimer);
    if (job.limitTimer) clearTimeout(job.limitTimer);
    scheduledJobs.delete(endpoint);
  }
  res.json({ success: true });
});

// Send immediate test push to device
app.post('/api/push/test', async (req, res) => {
  const { subscription } = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ success: false, error: 'Brak subskrypcji Web Push.' });
  }

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: '🔔 Test Web Push z serwera!',
        body: 'Powiadomienia Push z chmury działają poprawnie nawet po uśpieniu telefonu!',
        tag: 'test-push-notification',
        vibrate: [500, 200, 500, 200, 500],
        icon: '/pwa-192x192.png',
        badge: '/icon.svg',
        data: { url: '/?mode=widget' },
      })
    );
    res.json({ success: true });
  } catch (err: any) {
    console.error('[WebPush] Test notification error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Błąd wysyłania powiadomienia Push.',
    });
  }
});

// Proxy for Google Chat Webhooks to bypass browser CORS restrictions
app.post('/api/webhook/google-chat', async (req, res) => {
  const { webhookUrl, text, threadKey } = req.body;

  if (!webhookUrl || typeof webhookUrl !== 'string') {
    return res.status(400).json({ success: false, error: 'Brak wymaganego adresu URL webhooka.' });
  }

  if (!webhookUrl.startsWith('https://chat.googleapis.com/') && !webhookUrl.startsWith('https://')) {
    return res.status(400).json({ success: false, error: 'Nieprawidłowy adres URL webhooka. Oczekiwano https://...' });
  }

  try {
    let targetUrl = webhookUrl;
    if (threadKey) {
      const urlObj = new URL(targetUrl);
      urlObj.searchParams.set('threadKey', threadKey);
      targetUrl = urlObj.toString();
    }

    const payload = {
      text: text || 'Powiadomienie z PrzerwaPro',
    };

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        success: false,
        error: `Błąd Google Chat (${response.status}): ${errorText}`,
      });
    }

    const data = await response.json();
    return res.json({ success: true, data });
  } catch (error: any) {
    console.error('Webhook proxy error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Wystąpił błąd podczas wysyłania webhooka.',
    });
  }
});

// Proxy for Google Apps Script to bypass browser CORS in dev/preview & provide rich diagnostics
app.post('/api/sheets/proxy', async (req, res) => {
  const { scriptUrl, action = 'ping', userName, breakData } = req.body;

  if (!scriptUrl || typeof scriptUrl !== 'string') {
    return res.status(400).json({ success: false, message: 'Brak adresu URL skryptu.' });
  }

  let cleanUrl = scriptUrl.trim().replace(/^["']|["']$/g, '');
  if (cleanUrl.includes('/a/macros/')) {
    cleanUrl = cleanUrl.replace(/\/a\/macros\/[^/]+\/s\//, '/macros/s/');
  }
  if (cleanUrl.includes('/edit')) {
    cleanUrl = cleanUrl.replace(/\/edit.*$/, '/exec');
  }
  if (cleanUrl.endsWith('/dev')) {
    cleanUrl = cleanUrl.replace(/\/dev$/, '/exec');
  }
  if (cleanUrl.includes('/macros/s/') && !cleanUrl.endsWith('/exec')) {
    cleanUrl = cleanUrl.replace(/\/+$/, '') + '/exec';
  }

  try {
    if (action === 'ping' || action === 'get_breaks') {
      const urlObj = new URL(cleanUrl);
      urlObj.searchParams.set('action', action);
      if (userName) urlObj.searchParams.set('userName', userName);

      const response = await fetch(urlObj.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'PrzerwaPro-Sync-Agent/1.6.0',
        },
        redirect: 'follow',
      });

      const text = await response.text();

      // Check if redirected to ADEO / Leroy Merlin corporate SSO (idpb2e)
      if (text.includes('idpb2e') || text.includes('Authentication page') || text.includes('adeo.com')) {
        return res.json({
          success: false,
          requiresAuth: true,
          message: '⚠️ Wykryto blokadę logowania ADEO SSO (idpb2e)!\n\nTwój arkusz znajduje się na Dysku ADEO. Aby aplikacja mogła do niego zapisywać bez blokady portalu logowania:\n\n1. W Arkuszu ADEO wejdź w: Rozszerzenia ➔ Apps Script.\n2. Kliknij: Wdróż ➔ Zarządzaj wdrożeniami (ikona ołówka - Edytuj).\n3. W polu „Wersja” wybierz: Nowa wersja.\n4. W polu „Kto ma dostęp” (Who has access) zmień z „Każdy w organizacji ADEO” na: „Każdy” (Anyone)!\n5. Upewnij się, że „Wykonaj jako” to: „Ja”.\n\nArkusz nadal w 100% pozostanie w Twojej domenie ADEO, ale Google zezwoli na zapis przerw bez przekierowania do idpb2e.',
        });
      }

      // Check if redirected to standard Google Accounts login (meaning "Who has access" is not "Anyone")
      if (text.includes('accounts.google.com') || text.includes('Sign in') || text.includes('Zaloguj się') || text.includes('ServiceLogin')) {
        return res.json({
          success: false,
          requiresAuth: true,
          message: 'Arkusz wymaga zalogowania! W Apps Script w ustawieniach wdrożenia zmień pole "Kto ma dostęp" (Who has access) na "Każdy" (Anyone), a nie "Tylko ja".',
        });
      }

      try {
        const json = JSON.parse(text);
        return res.json(json);
      } catch {
        return res.json({
          success: false,
          message: `Odpowiedź z Apps Script nie jest JSON-em: ${text.slice(0, 150)}...`,
        });
      }
    } else if (action === 'record_break') {
      const payload = {
        action: 'record_break',
        userName: userName || 'Pracownik',
        break: breakData || {},
      };

      const response = await fetch(cleanUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8',
        },
        body: JSON.stringify(payload),
        redirect: 'follow',
      });

      const text = await response.text();
      try {
        const json = JSON.parse(text);
        return res.json(json);
      } catch {
        return res.json({
          success: true,
          message: 'Zapisano przerwę w Arkuszu Google.',
        });
      }
    }

    return res.status(400).json({ success: false, message: 'Nieznana akcja skryptu.' });
  } catch (err: any) {
    console.error('[SheetsProxy] Error:', err);
    return res.status(500).json({
      success: false,
      message: `Błąd serwera proxy: ${err?.message || 'Nieznany błąd'}`,
    });
  }
});

// Health endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      configFile: path.resolve(__dirname, 'vite.config.ts'),
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`PrzerwaPro server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
