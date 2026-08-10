import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/services/analytics';

/**
 * Hook that automatically tracks page views when route changes
 */
export function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    const pageName = location.pathname || 'unknown';
    trackPageView(pageName, {
      pathname: location.pathname,
      search: location.search,
    });
  }, [location.pathname, location.search]);
}
