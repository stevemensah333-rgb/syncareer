import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { installSupabaseMock } from '@/test/supabaseMock';
import i18n from '@/i18n/config';
import Settings from './Settings';
import type { UserProfileContextType } from '@/contexts/UserProfileContext';

/**
 * Settings is administrative infrastructure: one compact section list whose
 * destinations only ever expose what the backend supports. These tests pin the
 * information architecture, the deep links and legacy aliases, the mobile list
 * pattern, and the two writes the page actually owns (profile columns and
 * `user_feedback`).
 */

const profile = {
  id: 'user-1',
  username: 'test.student',
  full_name: 'Test Student',
  avatar_url: null,
  bio: null,
  linkedin_url: null,
  created_at: '2026-01-04T09:00:00.000Z',
  onboarding_completed: true,
  user_type: 'student',
};

const viewport = vi.hoisted(() => ({ mobile: false }));
const profileSignals = vi.hoisted(() => ({ current: null as unknown as UserProfileContextType }));
const toasts = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

// The role chrome is exercised by its own tests; page tests replace it with a
// bare <main> so assertions only see the settings shell.
vi.mock('@/components/layout/StudentLayout', () => ({
  StudentLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => viewport.mobile }));
vi.mock('sonner', () => ({ toast: toasts }));
vi.mock('@/contexts/UserProfileContext', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useUserProfile: () => profileSignals.current,
}));
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    isSignedIn: true,
    userId: 'user-1',
    user: {
      email: 'student@example.com',
      email_confirmed_at: '2026-01-04T09:30:00.000Z',
      created_at: '2026-01-04T09:00:00.000Z',
    },
  }),
  useRequireAuth: () => undefined,
}));

const updates: { profiles: unknown[] } = { profiles: [] };
const inserts: { user_feedback: unknown[] } = { user_feedback: [] };

function resetSupabase(overrides: Parameters<typeof installSupabaseMock>[0] = {}) {
  installSupabaseMock({
    sessionUserId: 'user-1',
    updateSpies: { profiles: (value) => updates.profiles.push(value) },
    insertSpies: { user_feedback: (value) => inserts.user_feedback.push(value) },
    ...overrides,
  });
}

function renderSettings(tab?: string) {
  return render(
    <MemoryRouter initialEntries={[tab ? `/settings?tab=${tab}` : '/settings']}>
      <Routes>
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeAll(async () => {
  await vi.waitFor(() => {
    if (!i18n.isInitialized) throw new Error('i18n is still initializing');
  });
});

beforeEach(() => {
  viewport.mobile = false;
  updates.profiles = [];
  inserts.user_feedback = [];
  profileSignals.current = {
    profile: profile as UserProfileContextType['profile'],
    studentDetails: null,
    loading: false,
    refreshProfile: vi.fn(async () => undefined),
  };
  toasts.success.mockReset();
  toasts.error.mockReset();
});

describe('Settings information architecture', () => {
  it('groups the destinations under Account, Preferences and Support', () => {
    resetSupabase();
    renderSettings();

    const nav = screen.getByRole('navigation', { name: 'Settings sections' });
    expect(within(nav).getByText('Account')).toBeTruthy();
    expect(within(nav).getByText('Support')).toBeTruthy();
    // "Preferences" is both a group and a destination, so it appears twice.
    expect(within(nav).getAllByText('Preferences')).toHaveLength(2);

    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href') as string)).toEqual([
      '/settings?tab=profile',
      '/settings?tab=account',
      '/settings?tab=notifications',
      '/settings?tab=preferences',
      '/settings?tab=feedback',
      '/settings?tab=help',
    ]);
    expect(links[0]!.getAttribute('aria-current')).toBe('page');
  });

  it('shows no destination or control that does not exist', () => {
    resetSupabase();
    renderSettings('account');
    renderSettings('preferences');

    for (const removed of ['Subscription', 'Billing', 'Regional', 'Compact view', 'Two-factor', 'Active sessions', 'Export my data']) {
      expect(screen.queryByText(new RegExp(removed, 'i'))).toBeNull();
    }
  });

  it('keeps the optional support destination out of the list until it is configured', () => {
    resetSupabase();
    renderSettings();
    expect(screen.queryByText('Support Syncareer')).toBeNull();

    const previous = import.meta.env.VITE_SUPPORT_URL;
    import.meta.env.VITE_SUPPORT_URL = 'https://support.example.org/syncareer';
    try {
      renderSettings();
      expect(screen.getAllByText('Support Syncareer').length).toBeGreaterThan(0);
      expect(screen.getAllByRole('link', { name: /Support Syncareer/ }).length).toBeGreaterThan(0);
    } finally {
      if (previous === undefined) delete import.meta.env.VITE_SUPPORT_URL;
      else import.meta.env.VITE_SUPPORT_URL = previous;
    }
  });

  it('uses a plain list on mobile and a back control inside a section', () => {
    resetSupabase();
    viewport.mobile = true;
    const view = renderSettings();

    expect(view.container.textContent).toContain('Account & Security');
    // Mobile lands on the list: no section is opened, so no section heading.
    expect(screen.queryByRole('heading', { name: 'Profile' })).toBeNull();

    view.unmount();
    renderSettings('notifications');
    expect(screen.getByRole('heading', { level: 2, name: 'Notifications' })).toBeTruthy();
    const back = screen.getByRole('link', { name: 'Settings' });
    expect(back.getAttribute('href')).toBe('/settings');
  });
});

describe('Settings destinations', () => {
  it('exposes the real notification preferences, unchanged from storage', async () => {
    resetSupabase({
      maybeSingle: {
        notification_preferences: {
          data: {
            user_id: 'user-1',
            email_enabled: true,
            push_enabled: false,
            weekly_digest: true,
            application_updates: true,
            interview_reminders: false,
            counsellor_bookings: true,
            system_announcements: true,
            marketing_emails: false,
          },
          error: null,
        },
      },
    });
    renderSettings('notifications');

    expect(await screen.findByText('Delivery')).toBeTruthy();
    expect(screen.getByText('Your activity')).toBeTruthy();
    expect(screen.getByText('Occasional email')).toBeTruthy();

    const email = await screen.findByRole('switch', { name: 'Email' });
    expect(email.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('switch', { name: 'In-app inbox' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('switch', { name: 'Career tips' }).getAttribute('aria-checked')).toBe('false');

    const updateSpies = { notification_preferences: vi.fn() };
    installSupabaseMock({
      sessionUserId: 'user-1',
      maybeSingle: {
        notification_preferences: {
          data: {
            user_id: 'user-1',
            email_enabled: true,
            push_enabled: false,
            weekly_digest: true,
            application_updates: true,
            interview_reminders: false,
            counsellor_bookings: true,
            system_announcements: true,
            marketing_emails: false,
          },
          error: null,
        },
      },
      updateSpies,
    });
    fireEvent.click(screen.getByRole('switch', { name: 'In-app inbox' }));
    await waitFor(() => expect(updateSpies.notification_preferences).toHaveBeenCalledWith({ push_enabled: true }));
  });

  it('applies language, region and time zone on this device instead of geolocating', () => {
    resetSupabase();
    renderSettings('regional');

    expect(screen.getByRole('heading', { name: 'Preferences' })).toBeTruthy();
    expect(screen.getByText('Language and region')).toBeTruthy();
    expect(screen.getAllByText('Time zone').length).toBeGreaterThan(0);
    expect(screen.getByText(/Syncareer never looks up your location/i)).toBeTruthy();
    expect(screen.getByText(/stored on this device/i)).toBeTruthy();
    expect(screen.queryByText(/Compact view/i)).toBeNull();
  });

  it('moves the old security tab into Account & Security', async () => {
    resetSupabase();
    renderSettings('security');

    expect(screen.getByRole('heading', { name: 'Account & Security' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign out other sessions' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Change password' })).toBeTruthy();
    expect(
      within(screen.getByRole('region', { name: 'Account' })).getByText('student@example.com'),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Delete my account' }));
    const dialog = await screen.findByRole('alertdialog');
    const confirm = within(dialog).getByRole('button', { name: 'Yes, delete my account' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(within(dialog).getByLabelText(/type delete/i), { target: { value: 'delete' } });
    expect(confirm.disabled).toBe(false);
  });
});

describe('Settings profile record', () => {
  it('saves the supported profile columns and refreshes the shared profile', async () => {
    resetSupabase();
    renderSettings('profile');

    const identity = screen.getByRole('region', { name: 'Identity' });
    fireEvent.click(within(identity).getByRole('button', { name: 'Edit' }));

    const name = within(identity).getByLabelText('Full name') as HTMLInputElement;
    expect(name.value).toBe('Test Student');
    fireEvent.change(name, { target: { value: 'Ama Mensah' } });
    fireEvent.click(within(identity).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(updates.profiles).toHaveLength(1));
    expect(updates.profiles[0]).toEqual({
      full_name: 'Ama Mensah',
      username: 'test.student',
      bio: null,
      linkedin_url: null,
    });
    await waitFor(() => expect(profileSignals.current.refreshProfile).toHaveBeenCalled());
    expect(toasts.success).toHaveBeenCalled();
  });

  it('rejects a username the database would refuse, without writing', async () => {
    resetSupabase();
    renderSettings('profile');

    const identity = screen.getByRole('region', { name: 'Identity' });
    fireEvent.click(within(identity).getByRole('button', { name: 'Edit' }));
    fireEvent.change(within(identity).getByLabelText('Username'), { target: { value: 'Ama!' } });
    fireEvent.click(within(identity).getByRole('button', { name: 'Save changes' }));

    expect(await within(identity).findByText(/3–30 characters/i)).toBeTruthy();
    expect(updates.profiles).toHaveLength(0);
  });

  it('carries the education and qualification records inside the profile', () => {
    resetSupabase();
    profileSignals.current = {
      ...profileSignals.current,
      studentDetails: {
        year_of_admission: 2022,
        expected_completion: 2026,
        major: 'Computer Science',
        school: 'University of Ghana',
        degree_type: 'BSc',
      },
    } as unknown as UserProfileContextType;
    renderSettings('profile');

    expect(screen.getByText('Education')).toBeTruthy();
    expect(screen.getByText('Computer Science')).toBeTruthy();
    expect(screen.getByText('University of Ghana')).toBeTruthy();
    expect(screen.getByText('Qualifications')).toBeTruthy();
  });
});

describe('Settings support destinations', () => {
  it('writes whole-product feedback with its kind', async () => {
    resetSupabase();
    renderSettings('feedback');

    fireEvent.click(screen.getByRole('radio', { name: /Report a problem/ }));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'The dashboard never shows my saved applications.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));

    await waitFor(() => expect(inserts.user_feedback).toHaveLength(1));
    expect(inserts.user_feedback[0]).toMatchObject({
      user_id: 'user-1',
      feature_name: 'general',
      response_type: 'problem',
      comment: 'The dashboard never shows my saved applications.',
    });
    await waitFor(() => expect(toasts.success).toHaveBeenCalled());
  });

  it('links the contacts that already exist instead of a ticket system', () => {
    resetSupabase();
    renderSettings('help');

    expect(screen.getByRole('link', { name: /syncareer01@gmail\.com/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /\+233 555 156 128/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Privacy policy' })).toBeTruthy();
    expect(screen.queryByText(/knowledge base|articles/i)).toBeNull();
  });
});
