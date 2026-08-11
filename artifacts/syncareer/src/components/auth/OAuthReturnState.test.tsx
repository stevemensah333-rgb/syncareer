import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import OAuthReturnState from './OAuthReturnState';
import { OAUTH_PENDING_KEY } from './authUtils';

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ isLoaded: true, isSignedIn: false }) }));

describe('OAuthReturnState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.setItem(OAUTH_PENDING_KEY, 'true');
    window.history.replaceState({}, '', '/');
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it('shows progress, then timeout recovery without exposing provider details', () => {
    render(<MemoryRouter><OAuthReturnState /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /completing Google sign-in/i })).toBeTruthy();
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.getByRole('heading', { name: /was not completed/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /try Google sign-in again/i }).getAttribute('href')).toBe('/sign-in');
  });
});
