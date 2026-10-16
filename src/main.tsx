import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Automatically reload page when new Service Worker version is installed & activated
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

// Automatically update service worker and reload when new version is deployed
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
      // Check immediately on app startup
      registration.update().catch(() => {});
      // Check every 20 seconds
      setInterval(() => {
        registration.update().catch(() => {});
      }, 20 * 1000);
    }
  },
});

// Periodic check for SW update on visibility change (e.g. unlocking phone or switching back to app)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.ready.then((registration) => {
        registration.update().catch(() => {});
      }).catch(() => {});
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);
