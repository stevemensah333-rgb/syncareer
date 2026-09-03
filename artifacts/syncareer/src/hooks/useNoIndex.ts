import { useEffect } from 'react';
import { setRobotsMeta } from '@/lib/seo';

/**
 * Marks the current route as `noindex, nofollow` while it is mounted and
 * restores the public default (`index, follow`) on unmount. Used by
 * authenticated/personalised surfaces and standalone utility pages so private
 * or non-content routes never get indexed, even by crawlers that execute JS.
 */
export function useNoIndex() {
  useEffect(() => {
    setRobotsMeta('noindex, nofollow');
    return () => setRobotsMeta('index, follow');
  }, []);
}
