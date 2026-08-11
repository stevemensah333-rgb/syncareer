import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ isLoaded: true, isSignedIn: false }) }));
vi.mock('@/contexts/UserProfileContext', () => ({ useUserProfile: () => ({ loading: false }) }));

describe('ProtectedRoute', () => {
  it('sends signed-out users to sign in and preserves the requested location', () => {
    render(
      <MemoryRouter initialEntries={['/applications?status=draft']}>
        <Routes>
          <Route path="/applications" element={<ProtectedRoute><p>Private</p></ProtectedRoute>} />
          <Route path="/sign-in" element={<p>Sign in required</p>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Sign in required')).toBeTruthy();
    expect(screen.queryByText('Private')).toBeNull();
  });
});
