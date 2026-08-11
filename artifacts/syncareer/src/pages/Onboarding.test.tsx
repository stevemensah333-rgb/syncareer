import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Onboarding from './Onboarding';
import { OnboardingShell } from '@/features/onboarding/OnboardingShell';

const refreshProfile = vi.fn().mockResolvedValue(undefined);

vi.mock('@/contexts/UserProfileContext', () => ({
  useUserProfile: () => ({ refreshProfile }),
}));

interface Result {
  data: unknown;
  error: unknown;
}

interface RecordedWrite {
  table: string;
  operation: 'insert' | 'update' | 'upsert';
  value: unknown;
}

function installTableResults(results: Record<string, Result>) {
  const writes: RecordedWrite[] = [];
  const from = supabase.from as unknown as ReturnType<typeof vi.fn>;
  from.mockImplementation((table: string) => {
    const result = results[table] ?? { data: null, error: null };
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    for (const method of ['select', 'eq']) builder[method] = chain;
    for (const operation of ['insert', 'update', 'upsert'] as const) {
      builder[operation] = (value: unknown) => {
        writes.push({ table, operation, value });
        return builder;
      };
    }
    builder.maybeSingle = () => Promise.resolve(result);
    builder.then = (
      resolve: (value: Result) => unknown,
      reject: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject);
    return builder;
  });
  return writes;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/onboarding']}>
      <Onboarding />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  const auth = supabase.auth as unknown as { getSession: ReturnType<typeof vi.fn> };
  auth.getSession.mockResolvedValue({
    data: {
      session: {
        user: {
          id: 'user-1',
          user_metadata: { full_name: 'Ama Mensah', user_type: 'student' },
        },
      },
    },
    error: null,
  });
});

describe('Onboarding interface', () => {
  it('uses the application canvas, sans heading, semantic card, and no marketing ornaments', () => {
    const { container } = render(
      <MemoryRouter>
        <OnboardingShell eyebrow="Student profile" title="Add your study details" subtitle="Profile details">
          <div>Content</div>
        </OnboardingShell>
      </MemoryRouter>,
    );

    const main = container.querySelector('main');
    const heading = screen.getByRole('heading', { level: 1 });
    expect(main?.className).toContain('bg-background');
    expect(main?.getAttribute('style')).toBeNull();
    expect(container.querySelector('.font-serif')).toBeNull();
    expect(container.querySelector('.italic')).toBeNull();
    expect(heading.className).toContain('font-semibold');
    expect(container.textContent).toContain('Account setup');
  });

  it('loads saved student details and presents a complete retry-safe form', async () => {
    localStorage.setItem('syncareer:onboarding-welcome-seen:user-1', '1');
    installTableResults({
      profiles: {
        data: { full_name: 'Ama Mensah', onboarding_completed: false, user_type: 'student' },
        error: null,
      },
      student_details: {
        data: {
          year_of_admission: 2024,
          expected_completion: 2027,
          major: 'Computer Science',
          school: 'University of Ghana',
          degree_type: "Bachelor's Degree",
        },
        error: null,
      },
    });

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Add your study details' })).toBeTruthy();
    expect((screen.getByLabelText('School / university') as HTMLInputElement).value).toBe('University of Ghana');
    expect(screen.getAllByText('Computer Science').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Complete setup/i })).toBeTruthy();
  });

  it('saves role details before marking the profile complete', async () => {
    localStorage.setItem('syncareer:onboarding-welcome-seen:user-1', '1');
    const writes = installTableResults({
      profiles: {
        data: { id: 'user-1', full_name: 'Ama Mensah', onboarding_completed: false, user_type: 'student' },
        error: null,
      },
      student_details: {
        data: {
          year_of_admission: 2024,
          expected_completion: 2027,
          major: 'Computer Science',
          school: 'University of Ghana',
          degree_type: "Bachelor's Degree",
        },
        error: null,
      },
    });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Complete setup/i }));

    await waitFor(() => expect(refreshProfile).toHaveBeenCalled());
    expect(writes.map(({ table, operation }) => `${table}:${operation}`)).toEqual([
      'student_details:upsert',
      'profiles:update',
    ]);
    expect(writes[1]?.value).toEqual({ onboarding_completed: true });
  });

  it('replaces an endless loading state with a visible error and working retry action', async () => {
    installTableResults({
      profiles: { data: null, error: { code: 'PGRST000' } },
    });

    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('We could not load your profile');
    const retry = screen.getByRole('button', { name: 'Try again' });
    fireEvent.click(retry);
    await waitFor(() => expect(supabase.auth.getSession).toHaveBeenCalledTimes(2));
  });

  it('shows explicit recovery when a stored account role is unsupported instead of a blank card', async () => {
    installTableResults({
      profiles: {
        data: { full_name: 'Ama Mensah', onboarding_completed: false, user_type: 'employer' },
        error: null,
      },
    });

    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('account role is missing or unsupported');
    expect(screen.queryByRole('button', { name: /Complete setup/i })).toBeNull();
  });
});
