import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { installSupabaseMock } from '@/test/supabaseMock';
import { supabase } from '@/integrations/supabase/client';
import ApplicationInterview from './ApplicationInterview';

vi.mock('@/components/layout/PageLayout', () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/hooks/useSupabaseUserId', () => ({
  useSupabaseUserId: () => '9f0a9a1e-0000-4000-8000-0000000000aa',
}));

const NOW = Date.now();
const USER = '9f0a9a1e-0000-4000-8000-0000000000aa';
const APPLICATION_ID = 'aa0a9a1e-0000-4000-8000-000000000001';

function makeApplicationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: APPLICATION_ID,
    applicant_id: USER,
    job_id: 'job-1',
    status: 'interview',
    notes: null,
    resume_id: null,
    next_action: null,
    next_action_due: null,
    job_title_snapshot: null,
    company_name_snapshot: null,
    source_snapshot: null,
    source_url_snapshot: null,
    location_snapshot: null,
    deadline_snapshot: null,
    external_id_snapshot: null,
    created_at: new Date(NOW - 86400000).toISOString(),
    updated_at: new Date(NOW - 86400000).toISOString(),
    job: {
      title: 'Graduate Analyst',
      location: 'Accra',
      employment_type: 'full-time',
      company_name: 'Acme Ghana',
      department: null,
      description: 'Analyse market data.',
      source: 'jobberman',
      source_url: 'https://example.com/jobs/1',
      application_deadline: null,
      skills: ['SQL'],
      experience_level: 'entry',
      updated_at: new Date(NOW - 86400000).toISOString(),
    },
    ...overrides,
  };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/applications/${APPLICATION_ID}/interview`]}>
        <Routes>
          <Route path="/applications/:applicationId/interview" element={<ApplicationInterview />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Application interview page', () => {
  it('derives the role context from the dossier and lists requirement coverage', async () => {
    installSupabaseMock({
      tables: {
        job_applications: { data: makeApplicationRow(), error: null },
        evidence_items: { data: [], error: null },
        evidence_sources: { data: [], error: null },
        application_requirements: {
          data: [
            {
              id: 'ee0a9a1e-0000-4000-8000-000000000002',
              application_id: APPLICATION_ID,
              user_id: USER,
              label: 'SQL',
              detail: null,
              origin: 'posting_skill',
              sort_order: 0,
              created_at: new Date(NOW - 86400000).toISOString(),
              updated_at: new Date(NOW - 86400000).toISOString(),
            },
          ],
          error: null,
        },
        application_evidence_links: { data: [], error: null },
      },
      maybeSingle: { job_applications: { data: makeApplicationRow(), error: null } },
    });
    (supabase.rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
    renderPage();

    expect(await screen.findByText('Graduate Analyst')).toBeTruthy();
    expect(screen.getByText('Configure the practice session')).toBeTruthy();
    expect(screen.getByText('What you already have')).toBeTruthy();
    expect(screen.getByText('SQL')).toBeTruthy();
    expect(screen.getByText('No evidence linked yet — practise an answer for this.')).toBeTruthy();
    // Voice practice is free: no premium gate, upgrade link, or pricing CTA.
    expect(screen.getByRole('button', { name: 'Start voice interview session' })).toBeTruthy();
    expect(screen.queryByText(/premium feature/i)).toBeNull();
    expect(screen.queryByRole('link', { name: /upgrade/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /pricing/i })).toBeNull();
  });

  it('shows a not-found state for a missing or foreign application', async () => {
    installSupabaseMock({
      maybeSingle: { job_applications: { data: null, error: null } },
    });
    renderPage();

    expect(await screen.findByText('Dossier not found')).toBeTruthy();
  });
});
