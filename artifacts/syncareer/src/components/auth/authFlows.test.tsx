import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ForgotPasswordForm from './ForgotPasswordForm';
import ResetPasswordForm from './ResetPasswordForm';
import SignInForm from './SignInForm';

const auth = supabase.auth as unknown as {
  signInWithPassword: ReturnType<typeof vi.fn>;
  resetPasswordForEmail: ReturnType<typeof vi.fn>;
  updateUser: ReturnType<typeof vi.fn>;
  getSession: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
  auth.signInWithPassword = vi.fn();
  auth.resetPasswordForEmail = vi.fn();
  auth.updateUser = vi.fn();
  auth.getSession = vi.fn();
});

describe('authentication form states', () => {
  it('rejects an empty sign-in submission before calling Supabase', () => {
    render(<MemoryRouter><SignInForm /></MemoryRouter>);
    fireEvent.submit(screen.getByRole('button', { name: /^sign in$/i }).closest('form')!);
    expect(screen.getByRole('alert').textContent).toContain('Enter your email and password');
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('prevents duplicate sign-in submissions and keeps a visible pending label', async () => {
    let resolve!: (value: unknown) => void;
    auth.signInWithPassword.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<MemoryRouter><SignInForm /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'ama@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'ValidPass1' } });
    const button = screen.getByRole('button', { name: /^sign in$/i });
    fireEvent.click(button);
    fireEvent.submit(button.closest('form')!);
    expect(auth.signInWithPassword).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /signing in/i }).getAttribute('aria-busy')).toBe('true');
    resolve({ error: null });
    await waitFor(() => expect(screen.getByRole('button', { name: /^sign in$/i })).toBeTruthy());
  });

  it('shows generic guidance for invalid credentials and never renders the raw error', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials: provider trace 123' } });
    render(<MemoryRouter><SignInForm /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'ama@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'wrong-pass' } });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect((await screen.findByRole('alert')).textContent).toContain('Email or password is incorrect');
    expect(screen.queryByText(/trace 123/i)).toBeNull();
  });

  it('supports password-manager autocomplete and an accessible visibility toggle', () => {
    render(<MemoryRouter><SignInForm /></MemoryRouter>);
    const password = screen.getByLabelText(/^password$/i);
    expect(password.getAttribute('autocomplete')).toBe('current-password');
    fireEvent.click(screen.getByRole('button', { name: /show password/i }));
    expect(password.getAttribute('type')).toBe('text');
    expect(screen.getByRole('button', { name: /hide password/i })).toBeTruthy();
  });

  it('preserves a safe protected-route redirect including its query string', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null });
    render(
      <MemoryRouter initialEntries={[{ pathname: '/sign-in', state: { from: { pathname: '/applications', search: '?status=draft' } } }]}>
        <Routes><Route path="/sign-in" element={<SignInForm />} /><Route path="/applications" element={<p>Applications destination</p>} /></Routes>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'ama@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'ValidPass1' } });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(await screen.findByText('Applications destination')).toBeTruthy();
  });

  it('requests a reset without revealing whether an account exists', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    render(<MemoryRouter><ForgotPasswordForm /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'unknown@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));
    expect(await screen.findByText(/if an account matches/i)).toBeTruthy();
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('unknown@example.com', {
      redirectTo: `${window.location.origin}/reset-password`,
    });
  });

  it('shows an expired-link recovery action when no reset session exists', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null } });
    render(<MemoryRouter><ResetPasswordForm /></MemoryRouter>);
    expect((await screen.findByRole('alert')).textContent).toMatch(/invalid or expired/i);
    expect(screen.getByRole('button', { name: /request a new link/i })).toBeTruthy();
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
});
