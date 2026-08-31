import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { getMobileNavigation, MobileBottomNav } from './MobileBottomNav';

let userType: string | null = 'student';

vi.mock('@/contexts/UserProfileContext', () => ({
  useUserProfile: () => ({ profile: { user_type: userType } }),
}));

describe('MobileBottomNav', () => {
  it('derives student destinations from the canonical navigation model', () => {
    const { tabs, moreItems } = getMobileNavigation('student');
    expect(tabs.map((item) => item.href)).toEqual([
      '/dashboard',
      '/opportunities',
      '/applications',
    ]);
    expect(moreItems.map((item) => item.href)).toEqual([
      '/mentors',
      '/practice',
      '/cv-builder',
      '/interview-simulator',
      '/mentorship/requests',
      '/settings',
    ]);
  });

  it('marks a primary mobile destination active', () => {
    userType = 'student';
    render(
      <MemoryRouter initialEntries={['/opportunities']}>
        <MobileBottomNav />
      </MemoryRouter>,
    );
    expect(screen.getByRole('navigation', { name: 'Mobile workspace navigation' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Opportunities' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: 'More navigation' }).className).toContain('focus-visible:ring-2');
  });

  it('keeps mentor requests and settings reachable', () => {
    const { tabs, moreItems } = getMobileNavigation('career_counsellor');
    expect(tabs.map((item) => item.href)).toEqual([
      '/mentor/profile',
      '/mentor/availability',
      '/mentorship/requests',
    ]);
    expect(moreItems.map((item) => item.href)).toEqual([
      '/settings',
    ]);
  });
});
