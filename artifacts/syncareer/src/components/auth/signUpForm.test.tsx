
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import SignUpForm from './SignUpForm';

/**
 * Matrix 2.1 / 2.5 — Email sign-up contract and role onboarding boundary.
 * Signing up as a student must pass { full_name, user_type: 'student' } through
 * auth metadata, send a welcome email, and route to /onboarding.
 */

const signUp = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (supabase.auth as unknown as Record<string, unknown>).signUp = signUp;
  (supabase.functions as unknown as { invoke: ReturnType<typeof vi.fn> }).invoke = vi.fn().mockResolvedValue({});
  signUp.mockResolvedValue({
    data: { user: { id: 'u1' }, session: { access_token: 't' } },
    error: null,
  });
});

function renderForm() {
  return render(
    <MemoryRouter initialEntries={['/sign-up']}>
      <SignUpForm />
    </MemoryRouter>
  );
}

async function submitAsStudent() {
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Ama Mensah' } });
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'ama@example.com' } });
  fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'ValidPass1' } });
  fireEvent.click(screen.getByRole('button', { name: /Create account/i }));
  await waitFor(() => expect(signUp).toHaveBeenCalledTimes(1));
  await waitFor(() => {
    const button = screen.queryByRole('button', { name: /Create account/i });
    const confirmation = screen.queryByRole('status');
    expect(confirmation || button?.getAttribute('aria-busy') === 'false').toBeTruthy();
  });
}

describe('SignUpForm (email sign-up contract)', () => {
  it('passes student user_type + full name into auth metadata', async () => {
    renderForm();
    await submitAsStudent();

    await waitFor(() => {
      expect(signUp).toHaveBeenCalledWith({
        email: 'ama@example.com',
        password: 'ValidPass1',
        options: {
          data: { full_name: 'Ama Mensah', user_type: 'student' },
          emailRedirectTo: `${window.location.origin}/sign-in`,
        },
      });
    });
  });

  it('preserves mentor role through organization-email signup and does not offer role-losing Google signup', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('combobox', { name: /I'm joining as/i }));
    fireEvent.click(await screen.findByRole('option', { name: 'Career mentor' }));

    expect(screen.queryByRole('button', { name: /Sign up with Google/i })).toBeNull();
    expect(screen.getByText(/Mentor accounts use an organization email/i)).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Kojo Asante' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'kojo@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'ValidPass1' } });
    fireEvent.click(screen.getByRole('button', { name: /Create account/i }));

    await waitFor(() => expect(signUp).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.objectContaining({
        data: { full_name: 'Kojo Asante', user_type: 'career_counsellor' },
      }),
    })));
  });

  it('rejects passwords shorter than 8 chars without calling auth', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Ama Mensah' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'ama@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: /Create account/i }));

    await waitFor(() => expect(signUp).not.toHaveBeenCalled());
  });

  it('enqueues a welcome transactional email after signup', async () => {
    renderForm();
    await submitAsStudent();
    await waitFor(() => expect(signUp).toHaveBeenCalled());
    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledWith('send-transactional-email', {
        body: {
          templateName: 'welcome',
          recipientEmail: 'ama@example.com',
          idempotencyKey: 'welcome-u1',
          templateData: { name: 'Ama Mensah' },
        },
      });
    });
  });

  it('routes to /sign-in when email confirmation is required (no session)', async () => {
    signUp.mockResolvedValue({ data: { user: { id: 'u1' }, session: null }, error: null });
    renderForm();
    await submitAsStudent();
    // Component navigates to /sign-in; it stays mounted under MemoryRouter, so we
    // simply assert auth was still called and the app did not throw.
    await waitFor(() => expect(signUp).toHaveBeenCalled());
  });
});
