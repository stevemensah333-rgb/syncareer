import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n/config'
import { initializeAnalytics } from './services/analytics'

const removeLegacyBrowserCaches = async () => {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  }
};

const runWhenIdle = (task: () => void, timeout = 3000) => {
  if (typeof (window as any).requestIdleCallback === 'function') {
    (window as any).requestIdleCallback(task, { timeout });
    return;
  }
  setTimeout(task, Math.min(timeout, 1000));
};

createRoot(document.getElementById("root")!).render(<App />);

runWhenIdle(() => {
  removeLegacyBrowserCaches().catch((error) => {
    console.warn('[startup] Legacy browser cache cleanup failed:', error);
  });
}, 1500);

// Defer analytics until the browser is idle so it never blocks first paint.
const startAnalytics = () => initializeAnalytics();
runWhenIdle(startAnalytics, 3000);
