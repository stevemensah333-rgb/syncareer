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
      { path: '/sign-up', element: <div>Sign-up route</div> },
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
  it('renders signed-out content while authentication is still resolving', () => {
    authState.isLoaded = false;
    renderLanding();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/know what your application needs/i);
    expect(screen.queryByText(/Loading Syncareer/i)).toBeNull();
  });

  it('provides a skip link to the main landmark', () => {
    renderLanding();
    const skip = screen.getByRole('link', { name: 'Skip to main content' });
    expect((skip as HTMLAnchorElement).getAttribute('href')).toBe('#main-content');
    expect(document.getElementById('main-content')?.tagName).toBe('MAIN');
  });

  it('uses opportunity exploration as the primary acquisition action', async () => {
    const router = renderLanding();

    fireEvent.click(screen.getAllByRole('button', { name: 'Explore opportunities' })[0]!);

    expect(await screen.findByText('Sign-up route')).toBeTruthy();
    expect(router.state.location.pathname).toBe('/sign-up');
    expect(router.state.location.search).toBe('?returnTo=%2Fopportunities');
  });

  it('keeps truthful canonical metadata and four FAQ schema entries', () => {
    renderLanding();
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://syncareer.me');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toMatch(/real opportunities/i);
    const schema = JSON.parse(document.getElementById('seo-jsonld-faqpage')?.textContent || '{}') as { mainEntity?: unknown[] };
    expect(schema.mainEntity).toHaveLength(4);
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
