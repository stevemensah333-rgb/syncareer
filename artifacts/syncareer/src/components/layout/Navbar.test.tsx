import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Navbar } from './Navbar';

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

describe('Navbar', () => {
  it('keeps contextual student destinations in the account area', () => {
    userType = 'student';
    render(<MemoryRouter><Navbar /></MemoryRouter>);
    openAccountMenu();
    expect(screen.getByText('Ama Student')).toBeTruthy();
    expect(screen.getByText('Mentor requests')).toBeTruthy();
    expect(screen.getByText('Subscription')).toBeTruthy();
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  it('labels the operational mentor account without student billing links', () => {
    userType = 'career_counsellor';
    render(<MemoryRouter><Navbar /></MemoryRouter>);
    openAccountMenu();
    expect(screen.getByText('Career mentor')).toBeTruthy();
    expect(screen.queryByText('Subscription')).toBeNull();
    expect(screen.queryByText('Mentor requests')).toBeNull();
    expect(screen.getByText('Settings')).toBeTruthy();
  });
});
