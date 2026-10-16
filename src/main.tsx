import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Automatically update service worker and reload when new version is deployed
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('Nowa wersja dostępna, odświeżanie aplikacji...');
    updateSW(true);
  },
  onOfflineReady() {
    console.log('Aplikacja gotowa do pracy offline');
  },
});

// Periodic check for SW update every 60 seconds and on tab visibility change
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then((registration) => {
    // Check on interval
    setInterval(() => {
      registration.update().catch(() => {});
    }, 60 * 1000);

    // Check when user returns to the app
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        registration.update().catch(() => {});
      }
    });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
