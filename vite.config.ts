import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  return {
    base: isProd ? './' : '/',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: isProd ? './' : '/',
          name: 'PrzerwaPro - Rejestrator Przerw',
          short_name: 'PrzerwaPro',
          description: 'Aplikacja PWA do rejestrowania przerw w pracy z limitem 30 min, alarmem dźwiękowym i kalendarzem.',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait',
          start_url: isProd ? './' : '/',
          scope: isProd ? './' : '/',
          icons: [
            {
              src: isProd ? './pwa-192x192.png' : '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: isProd ? './pwa-512x512.png' : '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          shortcuts: [
            {
              name: 'Widget Start & Stop',
              short_name: 'Widget',
              description: 'Jeden widget z dwoma przyciskami Start i Stop',
              url: '/?mode=widget',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
            },
            {
              name: 'Rozpocznij przerwę (Start)',
              short_name: 'Start',
              description: 'Szybkie rozpoczęcie przerwy',
              url: '/?action=start',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
            },
            {
              name: 'Zakończ przerwę (Stop)',
              short_name: 'Stop',
              description: 'Zakończenie aktywnej przerwy',
              url: '/?action=stop',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
            },
            {
              name: 'Miesięczny Kalendarz',
              short_name: 'Kalendarz',
              description: 'Zobacz historię przerw',
              url: '/?tab=calendar',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          importScripts: ['/sw-actions.js'],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: false,
      watch: null,
    },
  };
});
