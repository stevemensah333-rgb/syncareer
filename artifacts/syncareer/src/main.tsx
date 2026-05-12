import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n/config'
import { initializeAnalytics } from './services/analytics'

createRoot(document.getElementById("root")!).render(<App />);

// Defer analytics until the browser is idle so it never blocks first paint.
const startAnalytics = () => initializeAnalytics();
if (typeof (window as any).requestIdleCallback === 'function') {
  (window as any).requestIdleCallback(startAnalytics, { timeout: 3000 });
} else {
  setTimeout(startAnalytics, 2000);
}
