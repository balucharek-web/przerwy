import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const clientPath = path.resolve(__dirname, '../node_modules/vite/dist/client/client.mjs');

if (fs.existsSync(clientPath)) {
  let content = fs.readFileSync(clientPath, 'utf8');
  let modified = false;

  if (content.includes('reject(/* @__PURE__ */ new Error("WebSocket closed without opened."));')) {
    content = content.replace(
      'reject(/* @__PURE__ */ new Error("WebSocket closed without opened."));',
      'isOpened = true; resolve();'
    );
    modified = true;
  }

  if (content.includes('console.error(`[vite] failed to connect to websocket')) {
    content = content.replace(
      /console\.error\(`\[vite\] failed to connect to websocket/g,
      'console.debug(`[vite] failed to connect to websocket'
    );
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(clientPath, content, 'utf8');
    console.log('[patch-vite] Successfully patched @vite/client for Cloud Run environment');
  }
}
