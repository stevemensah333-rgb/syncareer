import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { supabase } from '@/integrations/supabase/client';
import GoogleSignInButton from './GoogleSignInButton';

/**
 * Matrix 2.4 — Lovable Google OAuth session handoff boundary.
 *
 * We mock the underlying Lovable SDK (`@lovable.dev/cloud-auth-js`) so the real
 * `@/integrations/lovable` wrapper and button execute: the OAuth result must be
 * translated into a Supabase session (setSession) before the SPA navigates.
 * Outcomes under test: redirected | error | tokens.
 */

const { lovableSignIn } = vi.hoisted(() => ({ lovableSignIn: vi.fn() }));

vi.mock('@lovable.dev/cloud-auth-js', () => ({
  createLovableAuth: () => ({ signInWithOAuth: lovableSignIn }),
}));

const setSession = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (supabase.auth as unknown as Record<string, unknown>).setSession = setSession;
  setSession.mockResolvedValue({ error: null });
  vi.spyOn(window.location, 'assign').mockImplementation(() => {});
  sessionStorage.clear();
});

async function clickSignIn() {
  render(<GoogleSignInButton />);
  fireEvent.click(screen.getByRole('button', { name: /Continue with Google/i }));
  await waitFor(() => expect(lovableSignIn).toHaveBeenCalled());
}

describe('GoogleSignInButton OAuth handoff', () => {
  it('requests the google provider with the browser origin as redirect target', async () => {
    lovableSignIn.mockResolvedValue({ redirected: false, error: null, tokens: null });
    await clickSignIn();
    expect(lovableSignIn).toHaveBeenCalledWith(
      'google',
      expect.objectContaining({ redirect_uri: window.location.origin })
    );
  });

  it('does not write a session or navigate when the browser is redirecting', async () => {
    lovableSignIn.mockResolvedValue({ redirected: true, error: null });
    await clickSignIn();
    expect(setSession).not.toHaveBeenCalled();
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it('surfaces a provider error without navigating', async () => {
    lovableSignIn.mockResolvedValue({ redirected: false, error: { message: 'User cancelled' } });
    await clickSignIn();
    expect(setSession).not.toHaveBeenCalled();
    expect(window.location.assign).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toMatch(/cancelled/i);
  });

  it('writes returned tokens into a Supabase session, then navigates to /', async () => {
    const tokens = { access_token: 'a', refresh_token: 'r' };
    lovableSignIn.mockResolvedValue({ redirected: false, error: null, tokens });
    await clickSignIn();
    await waitFor(() => expect(setSession).toHaveBeenCalledWith(tokens));
    await waitFor(() => expect(window.location.assign).toHaveBeenCalledWith('/'));
  });

  it('does not navigate if writing the session fails', async () => {
    setSession.mockResolvedValue({ error: { message: 'session failed' } });
    lovableSignIn.mockResolvedValue({
      redirected: false,
      error: null,
      tokens: { access_token: 'a', refresh_token: 'r' },
    });
    await clickSignIn();
    await waitFor(() => expect(setSession).toHaveBeenCalled());
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it('treats a thrown SDK error as a failed sign-in without navigating', async () => {
    lovableSignIn.mockRejectedValue(new Error('network down'));
    await clickSignIn();
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it('prevents a duplicate click while the provider request is pending', async () => {
    let resolve!: (value: unknown) => void;
    lovableSignIn.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<GoogleSignInButton />);
    const button = screen.getByRole('button', { name: /Continue with Google/i });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(lovableSignIn).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /opening Google/i }).getAttribute('aria-busy')).toBe('true');
    resolve({ redirected: true, error: null });
  });
});
