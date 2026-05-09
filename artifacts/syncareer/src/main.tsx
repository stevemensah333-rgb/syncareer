import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n/config'
import { initializeSentry } from './services/sentry'
import { initializeAnalytics } from './services/analytics'

// Initialize Sentry for error tracking
initializeSentry();

// Initialize PostHog for analytics
initializeAnalytics();

createRoot(document.getElementById("root")!).render(<App />);
