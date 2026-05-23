import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n/config'
import { initializeAnalytics } from './services/analytics'

const removeLegacyOfflineSupport = async () => {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  }
};

removeLegacyOfflineSupport().catch((error) => {
  console.warn('[startup] Legacy offline cleanup failed:', error);
});

createRoot(document.getElementById("root")!).render(<App />);

// Defer analytics until the browser is idle so it never blocks first paint.
const startAnalytics = () => initializeAnalytics();
if (typeof (window as any).requestIdleCallback === 'function') {
  (window as any).requestIdleCallback(startAnalytics, { timeout: 3000 });
} else {
  setTimeout(startAnalytics, 2000);
}
