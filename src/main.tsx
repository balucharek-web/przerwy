import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// 1. Immediately render React application
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<App />);
}

// 2. Safe Service Worker registration (only when top-level standalone window, never inside preview iframes)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.self === window.top) {
  try {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('Nowa wersja dostępna, odświeżanie aplikacji...');
        updateSW(true);
      },
      onOfflineReady() {
        console.log('Aplikacja gotowa do pracy offline');
      },
      onRegistered(registration) {
        if (registration) {
          registration.update().catch(() => {});
          setInterval(() => {
            registration.update().catch(() => {});
          }, 30 * 1000);
        }
      },
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        navigator.serviceWorker.ready.then((registration) => {
          registration.update().catch(() => {});
        }).catch(() => {});
      }
    });
  } catch (err) {
    console.warn('PWA registration skipped:', err);
  }
}
