import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSidebarCollapsed } from './useSidebarCollapsed';

describe('useSidebarCollapsed', () => {
  it('starts expanded and persists the choice across mounts', () => {
    window.localStorage.clear();
    const first = renderHook(() => useSidebarCollapsed());
    expect(first.result.current.isCollapsed).toBe(false);

    act(() => first.result.current.toggleCollapsed());
    expect(window.localStorage.getItem('syncareer.sidebar.collapsed')).toBe('1');
    first.unmount();

    // The layout remounts on every route change; the choice must survive.
    const second = renderHook(() => useSidebarCollapsed());
    expect(second.result.current.isCollapsed).toBe(true);

    act(() => second.result.current.toggleCollapsed());
    expect(window.localStorage.getItem('syncareer.sidebar.collapsed')).toBe('0');
  });
});
