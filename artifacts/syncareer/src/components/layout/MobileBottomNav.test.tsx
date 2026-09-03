import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
      '/cv-builder',
      '/interview-simulator',
      '/mentors',
    ]);
  });

  it('keeps a single bar: primary tabs plus a More sheet, not a second nav', async () => {
    userType = 'student';
    render(
      <MemoryRouter initialEntries={['/opportunities']}>
        <MobileBottomNav />
      </MemoryRouter>,
    );
    const bar = screen.getByRole('navigation', { name: 'Mobile workspace navigation' });
    expect(bar).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Home' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Opportunities' }).getAttribute('aria-current')).toBe('page');
    // Secondary destinations are not duplicated as tabs; they live in More.
    expect(screen.queryByRole('link', { name: 'CV Builder' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'More destinations' }));
    const cvBuilder = await screen.findByRole('link', { name: 'CV Builder' });
    expect(cvBuilder.getAttribute('href')).toBe('/cv-builder');
    expect(screen.getByRole('link', { name: 'Interview' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Mentors' })).toBeTruthy();
  });

  it('marks a More destination as current on the bar', () => {
    userType = 'student';
    render(
      <MemoryRouter initialEntries={['/cv-builder']}>
        <MobileBottomNav />
      </MemoryRouter>,
    );
    const more = screen.getByRole('button', { name: 'More destinations' });
    expect(more.className).toContain('text-primary');
    expect(screen.getByRole('link', { name: 'Applications' }).hasAttribute('aria-current')).toBe(false);
  });

  it('keeps mentor requests and settings reachable without a More sheet', () => {
    expect(getMobileNavigation('career_counsellor').map((item) => item.href)).toEqual([
      '/mentor/profile',
      '/mentorship/requests',
      '/mentor/availability',
      '/settings',
    ]);
    userType = 'career_counsellor';
    render(
      <MemoryRouter initialEntries={['/mentorship/requests']}>
        <MobileBottomNav />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Requests' }).getAttribute('aria-current')).toBe('page');
    expect(screen.queryByRole('button', { name: 'More destinations' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Requests' }).className).toContain('focus-visible:ring-2');
  });

  it('closes the More sheet after choosing a destination', async () => {
    userType = 'student';
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <MobileBottomNav />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'More destinations' }));
    fireEvent.click(await screen.findByRole('link', { name: 'Mentors' }));
    await waitFor(() => {
      expect(screen.queryByRole('link', { name: 'Mentors' })).toBeNull();
    });
  });
});
