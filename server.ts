import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);
const PORT = 3000;

app.use(express.json());

// Proxy for Google Chat Webhooks to bypass browser CORS restrictions
app.post('/api/webhook/google-chat', async (req, res) => {
  const { webhookUrl, text, threadKey } = req.body;

  if (!webhookUrl || typeof webhookUrl !== 'string') {
    return res.status(400).json({ success: false, error: 'Brak wymaganego adresu URL webhooka.' });
  }

  // Validate that it looks like Google Chat webhook or generic webhook
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

// Health endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
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
