import { useEffect, useState } from 'react';

const HOVER_QUERY = '(hover: hover) and (pointer: fine)';

/**
 * True when the device can genuinely hover with a fine pointer (mouse-like).
 * Progressive-disclosure previews (hover cards) are only attached then;
 * touch devices go straight to the full detail view instead, so no
 * information is hover-only.
 */
export function useHoverCapability(): boolean {
  const [canHover, setCanHover] = useState<boolean>(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(HOVER_QUERY).matches
      : false,
  );

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(HOVER_QUERY);
    const onChange = () => setCanHover(mql.matches);
    mql.addEventListener('change', onChange);
    setCanHover(mql.matches);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return canHover;
}
