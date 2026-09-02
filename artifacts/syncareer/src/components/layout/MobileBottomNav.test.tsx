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
    expect(getMobileNavigation('student').map((item) => item.href)).toEqual([
      '/dashboard',
      '/opportunities',
      '/applications',
      '/mentors',
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
    expect(screen.getByRole('link', { name: 'Mentors' }).className).toContain('focus-visible:ring-2');
  });

  it('keeps mentor requests and settings reachable', () => {
    expect(getMobileNavigation('career_counsellor').map((item) => item.href)).toEqual([
      '/mentor/profile',
      '/mentorship/requests',
      '/mentor/availability',
      '/settings',
    ]);
  });
});
