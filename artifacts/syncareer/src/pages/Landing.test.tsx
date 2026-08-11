import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import Landing from './Landing';

const authState = vi.hoisted(() => ({ isLoaded: true, isSignedIn: false }));
const profileState = vi.hoisted(() => ({
  profile: { onboarding_completed: true, user_type: 'student' } as Record<string, unknown> | null,
  loading: false,
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => authState,
}));

vi.mock('@/contexts/UserProfileContext', () => ({
  useUserProfile: () => profileState,
}));

function renderLanding() {
  const router = createMemoryRouter(
    [
      { path: '/', element: <Landing /> },
      { path: '/assessment', element: <div>Assessment route</div> },
      { path: '/dashboard', element: <div>Dashboard route</div> },
      { path: '/onboarding', element: <div>Onboarding route</div> },
      { path: '/sign-in', element: <div>Sign-in route</div> },
    ],
    { initialEntries: ['/'] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  authState.isLoaded = true;
  authState.isSignedIn = false;
  profileState.profile = { onboarding_completed: true, user_type: 'student' };
  profileState.loading = false;
});

afterEach(() => cleanup());

describe('Landing routing', () => {
  it('uses the public assessment as the primary acquisition action', async () => {
    const router = renderLanding();

    fireEvent.click(screen.getAllByRole('button', { name: 'Start career assessment' })[0]!);

    expect(await screen.findByText('Assessment route')).toBeTruthy();
    expect(router.state.location.pathname).toBe('/assessment');
  });

  it('preserves the role-aware redirect for an onboarded authenticated visitor', async () => {
    authState.isSignedIn = true;
    const router = renderLanding();

    expect(await screen.findByText('Dashboard route')).toBeTruthy();
    expect(router.state.location.pathname).toBe('/dashboard');
  });

  it('sends an authenticated visitor with an incomplete profile to onboarding', async () => {
    authState.isSignedIn = true;
    profileState.profile = null;
    const router = renderLanding();

    expect(await screen.findByText('Onboarding route')).toBeTruthy();
    expect(router.state.location.pathname).toBe('/onboarding');
  });
});
