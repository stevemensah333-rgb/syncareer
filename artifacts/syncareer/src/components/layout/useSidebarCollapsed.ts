import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'syncareer.sidebar.collapsed';

function readStored(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Sidebar collapse is workspace chrome state, not page state: the layout
 *  remounts on every route change, so the choice must survive navigation and
 *  reloads to feel deliberate rather than resetting per page. */
export function useSidebarCollapsed() {
  const [isCollapsed, setIsCollapsed] = useState(readStored);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, isCollapsed ? '1' : '0');
    } catch {
      // Storage unavailable (blocked or quota-exceeded): keep the in-memory choice.
    }
  }, [isCollapsed]);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((current) => !current);
  }, []);

  return { isCollapsed, toggleCollapsed };
}
