import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Navbar } from './Navbar';
import { studentNavGroups } from './AppSidebar';

// The support entry point is optional configuration, never a default. The
// seam itself (env read) is covered by lib/support.test.ts; here we control it
// through a mock to assert the menu behaviour in both states.
const supportMocks = vi.hoisted(() => ({
  enabled: false,
  url: 'https://support.example.com/one-time',
  isSupportEnabled: vi.fn(() => supportMocks.enabled),
  supportUrl: vi.fn(() => supportMocks.url),
}));

vi.mock('@/lib/support', () => supportMocks);

let userType = 'student';

vi.mock('@/contexts/UserProfileContext', () => ({
  useUserProfile: () => ({
    profile: {
      full_name: userType === 'career_counsellor' ? 'Kwame Mentor' : 'Ama Student',
      avatar_url: null,
      user_type: userType,
    },
  }),
}));

vi.mock('@/hooks/useSupabaseUserId', () => ({ useSupabaseUserId: () => null }));
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ signOut: vi.fn() }) }));
vi.mock('@/components/notifications/NotificationsDropdown', () => ({
  NotificationsDropdown: () => <button type="button">Notifications</button>,
}));

function openAccountMenu() {
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Open account menu' }), {
    button: 0,
    pointerType: 'mouse',
  });
}

beforeEach(() => {
  supportMocks.enabled = false;
});

describe('Navbar', () => {
  it('derives the current context from the navigation model', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Navbar navigation={studentNavGroups} />
      </MemoryRouter>,
    );
    const trail = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(trail).toBeTruthy();
    expect(screen.getByText('Workspace')).toBeTruthy();
    expect(screen.getByText('Home', { selector: 'span[aria-current="page"]' })).toBeTruthy();
  });

  it('keeps the parent context on sub-routes', () => {
    render(
      <MemoryRouter initialEntries={['/applications/app-1']}>
        <Navbar navigation={studentNavGroups} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Workspace')).toBeTruthy();
    expect(screen.getByText('Applications', { selector: 'span[aria-current="page"]' })).toBeTruthy();
  });

  it('prefers explicit page breadcrumbs over the derived context', () => {
    render(
      <MemoryRouter initialEntries={['/cv-builder']}>
        <Navbar
          navigation={studentNavGroups}
          breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'CV Builder' }]}
        />
      </MemoryRouter>,
    );
    expect((screen.getByRole('link', { name: 'Home' }) as HTMLAnchorElement).getAttribute('href')).toBe('/dashboard');
    expect(screen.getByText('CV Builder', { selector: 'span[aria-current="page"]' })).toBeTruthy();
  });

  it('stays quiet when the route has no navigation context', () => {
    render(
      <MemoryRouter initialEntries={['/analysis']}>
        <Navbar navigation={studentNavGroups} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).toBeNull();
  });

  it('keeps contextual student destinations in the account area', () => {
    userType = 'student';
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Navbar navigation={studentNavGroups} />
      </MemoryRouter>,
    );
    openAccountMenu();
    expect(screen.getByText('Ama Student')).toBeTruthy();
    expect(screen.getByText('Mentor requests')).toBeTruthy();
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  it('labels the operational mentor account without student links', () => {
    userType = 'career_counsellor';
    render(
      <MemoryRouter initialEntries={['/mentorship/requests']}>
        <Navbar navigation={studentNavGroups} />
      </MemoryRouter>,
    );
    openAccountMenu();
    expect(screen.getByText('Career mentor')).toBeTruthy();
    expect(screen.queryByText('Mentor requests')).toBeNull();
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  it('offers Feedback instead of any plan, subscription, or billing item', () => {
    userType = 'student';
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Navbar navigation={studentNavGroups} />
      </MemoryRouter>,
    );
    openAccountMenu();
    expect(screen.getByText('Feedback')).toBeTruthy();
    expect(screen.queryByText('Subscription')).toBeNull();
    expect(screen.queryByText('Upgrade')).toBeNull();
    expect(screen.queryByText('Billing')).toBeNull();
    expect(screen.queryByText(/premium/i)).toBeNull();
    expect(screen.queryByText(/current plan/i)).toBeNull();
    // Feature access must not depend on a plan: the account menu carries no
    // plan status, badge, or renewal information.
    expect(screen.queryByText(/renew/i)).toBeNull();
  });

  it('shows the optional support item only when a support URL is configured', () => {
    userType = 'student';
    const { unmount } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Navbar navigation={studentNavGroups} />
      </MemoryRouter>,
    );
    openAccountMenu();
    expect(screen.queryByText('Support Syncareer')).toBeNull();
    unmount();

    supportMocks.enabled = true;
    supportMocks.url = 'https://support.example.com/one-time';
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Navbar navigation={studentNavGroups} />
      </MemoryRouter>,
    );
    openAccountMenu();
    const supportLabel = screen.getByText('Support Syncareer');
    const supportLink = supportLabel.closest('a');
    expect(supportLink).not.toBeNull();
    expect(supportLink?.getAttribute('href')).toBe('https://support.example.com/one-time');
    expect(screen.getByText(/Syncareer is free either way/i)).toBeTruthy();
  });
});
