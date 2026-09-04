import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Moves keyboard and assistive-technology context to the newly rendered page. */
export function RouteFocusManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('main#main-content')?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}
