import { trackWebVitals } from '@/lib/analyticsEvents';

/**
 * Track Core Web Vitals using the Web Vitals API
 */
export function initializeWebVitalsTracking() {
  if ('web-vital' in window) {
    // Already loaded
    return;
  }

  // Try to use the web-vitals library if available
  try {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(({ value, name }) => {
        trackWebVitals(name, value);
      });

      getFID(({ value, name }) => {
        trackWebVitals(name, value);
      });

      getFCP(({ value, name }) => {
        trackWebVitals(name, value);
      });

      getLCP(({ value, name }) => {
        trackWebVitals(name, value);
      });

      getTTFB(({ value, name }) => {
        trackWebVitals(name, value);
      });
    });
  } catch (error) {
    console.warn('[WebVitals] Failed to initialize web vitals tracking:', error);
  }

  // Track Performance Observer metrics
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navTiming = entry as PerformanceNavigationTiming;
            trackWebVitals('page_load_time', navTiming.loadEventEnd - navTiming.loadEventStart);
            trackWebVitals('dom_interactive', navTiming.domInteractive - navTiming.fetchStart);
          }
        }
      });

      observer.observe({ entryTypes: ['navigation'] });
    } catch (error) {
      console.warn('[WebVitals] Failed to observe performance:', error);
    }
  }
}
