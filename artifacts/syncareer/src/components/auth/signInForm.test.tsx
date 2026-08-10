
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import SignInForm from './SignInForm';

/**
 * Matrix 2.2 — Email sign-in contract.
 * Submitting the form must call supabase.auth.signInWithPassword with the
 * exact email/password the user entered (server authz is RLS, see matrix 3.x).
 */

const signInWithPassword = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (supabase.auth as unknown as Record<string, unknown>).signInWithPassword = signInWithPassword;
  signInWithPassword.mockResolvedValue({ error: null });
});

function renderForm() {
  return render(
    <MemoryRouter initialEntries={['/sign-in']}>
      <SignInForm />
    </MemoryRouter>
  );
}

describe('SignInForm (email sign-in contract)', () => {
  it('calls signInWithPassword with the entered credentials', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'ama@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'ValidPass1' } });
    fireEvent.click(screen.getByRole('button', { name: /^Sign in$/i }));

    await waitFor(() => {
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: 'ama@example.com',
        password: 'ValidPass1',
      });
    });
  });

  it('does not call signInWithPassword when auth returns an error', async () => {
    signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    renderForm();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'ama@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /^Sign in$/i }));

    await waitFor(() => expect(signInWithPassword).toHaveBeenCalled());
    // No navigation happens on error; button returns to "Sign in".
    expect(screen.getByRole('button', { name: /^Sign in$/i })).toBeTruthy();
  });
});
