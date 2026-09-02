import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './assets/fonts/literata.css'
import './index.css'
import './i18n/config'
import { initializeAnalytics } from './services/analytics'
import { initializeDisplayPreferences } from './lib/displayPreferences'

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

initializeDisplayPreferences();
createRoot(document.getElementById("root")!).render(<App />);

runWhenIdle(() => {
  removeLegacyBrowserCaches().catch((error) => {
    console.warn('[startup] Legacy browser cache cleanup failed:', error);
  });
}, 1500);

// Analytics is downloaded lazily the first time an event is tracked or on
// first user interaction (whichever comes first). This keeps ~190 kB of
// posthog-js off the initial download for users who bounce immediately,
// without losing events that fire shortly after page load (they're queued).
let analyticsScheduled = false;
const scheduleAnalyticsLoad = () => {
  if (analyticsScheduled) return;
  analyticsScheduled = true;
  runWhenIdle(() => initializeAnalytics(), 3000);
};
// Load on first interaction (covers authenticated sessions where events
// fire almost immediately after hydration).
const onFirstInput = () => {
  scheduleAnalyticsLoad();
  window.removeEventListener('pointerdown', onFirstInput);
  window.removeEventListener('keydown', onFirstInput);
  window.removeEventListener('scroll', onFirstInput, { capture: true });
};
window.addEventListener('pointerdown', onFirstInput, { passive: true });
window.addEventListener('keydown', onFirstInput);
window.addEventListener('scroll', onFirstInput, { passive: true, capture: true });
// Also load during idle for passive observers (e.g. analytics-only pageviews
// without user interaction).
runWhenIdle(scheduleAnalyticsLoad, 4500);
