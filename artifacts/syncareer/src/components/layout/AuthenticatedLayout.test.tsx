import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthenticatedLayout } from './AuthenticatedLayout';
import { studentNavGroups } from './AppSidebar';

/**
 * Authenticated shell integration: the student/mentor workspace must expose
 * one global navigation system per breakpoint. Desktop shows the labelled
 * rail and top bar; mobile replaces it with the single bottom bar. Either
 * way the shell keeps accessible landmarks and the skip link, and the active
 * destination is announced to assistive tech via aria-current.
 */

let isMobile = false;

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => isMobile,
}));

vi.mock('@/contexts/UserProfileContext', () => ({
  useUserProfile: () => ({
    profile: { full_name: 'Ama Student', avatar_url: null, user_type: 'student' },
  }),
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ signOut: vi.fn(), isSignedIn: true }),
}));

vi.mock('@/hooks/useSupabaseUserId', () => ({ useSupabaseUserId: () => null }));
vi.mock('@/features/navigation/useCurrentDossier', () => ({ useCurrentDossier: () => null }));
vi.mock('@/components/notifications/NotificationsDropdown', () => ({
  NotificationsDropdown: () => <button type="button">Notifications</button>,
}));
vi.mock('@/components/feedback/GeneralFeedbackDialog', () => ({
  GeneralFeedbackDialog: () => null,
}));

function renderShell(initialEntry = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthenticatedLayout
        title="Dashboard"
        description="Your career workspace"
        navigation={studentNavGroups}
        role="student"
      >
        <div>Workspace content</div>
      </AuthenticatedLayout>
    </MemoryRouter>,
  );
}

describe('AuthenticatedLayout (workspace shell)', () => {
  beforeEach(() => {
    isMobile = false;
  });

  it('uses the canvas shell with a skip link, main landmark and labelled rail on desktop', () => {
    const { container } = renderShell('/applications');

    expect(screen.getByRole('link', { name: 'Skip to main content' })).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();
    expect(screen.getByRole('complementary')).toBeTruthy();

    const nav = screen.getByRole('navigation', { name: 'Workspace navigation' });
    expect(nav).toBeTruthy();
    expect(screen.getByText('Workspace content')).toBeTruthy();

    // The shell sits on the pale canvas; only real work surfaces inside it
    // are white/bordered. The canvas class is applied at the shell root.
    const shell = container.firstElementChild as HTMLElement;
    expect(shell.className).toContain('workspace-shell');
    expect(shell.className).toContain('bg-background');
  });

  it('keeps desktop and mobile navigation mutually exclusive', () => {
    const { unmount } = renderShell('/dashboard');
    expect(screen.getByRole('navigation', { name: 'Workspace navigation' })).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'Mobile workspace navigation' })).toBeNull();
    unmount();

    isMobile = true;
    renderShell('/dashboard');

    expect(screen.queryByRole('complementary')).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'Workspace navigation' })).toBeNull();
    const mobileNav = screen.getByRole('navigation', { name: 'Mobile workspace navigation' });
    expect(mobileNav).toBeTruthy();
    // Only one global mobile navigation surface is rendered (the bottom bar).
    const globalNavs = screen
      .getAllByRole('navigation')
      .filter((node) => ['Workspace navigation', 'Mobile workspace navigation'].includes(node.getAttribute('aria-label') ?? ''));
    expect(globalNavs).toHaveLength(1);
    expect(globalNavs[0]).toBe(mobileNav);
  });

  it('marks the current destination active through the navigation model', () => {
    renderShell('/applications');
    const nav = screen.getByRole('navigation', { name: 'Workspace navigation' });
    const applications = within(nav).getByRole('link', { name: 'Applications' });
    expect(applications.getAttribute('aria-current')).toBe('page');
    expect(within(nav).getByRole('link', { name: 'Home' }).hasAttribute('aria-current')).toBe(false);
  });

  it('keeps navigation keyboard-focusable with a visible focus treatment', () => {
    renderShell('/dashboard');
    const nav = screen.getByRole('navigation', { name: 'Workspace navigation' });
    const opportunities = within(nav).getByRole('link', { name: 'Opportunities' });
    opportunities.focus();
    expect(document.activeElement).toBe(opportunities);
    expect(opportunities.className).toContain('focus-visible:ring-2');
  });
});
