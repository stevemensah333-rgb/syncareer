import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { installSupabaseMock } from '@/test/supabaseMock';
import { supabase } from '@/integrations/supabase/client';
import ApplicationDossier from './ApplicationDossier';

vi.mock('@/components/layout/PageLayout', () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/hooks/useSupabaseUserId', () => ({
  useSupabaseUserId: () => '9f0a9a1e-0000-4000-8000-0000000000aa',
}));
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => (window as { innerWidth?: number }).innerWidth !== undefined && window.innerWidth < 1024,
}));

const NOW = Date.now();
const USER = '9f0a9a1e-0000-4000-8000-0000000000aa';
const APPLICATION_ID = 'aa0a9a1e-0000-4000-8000-000000000001';
const RESUME_ID = 'bb0a9a1e-0000-4000-8000-000000000001';
const INTERVIEW_ID = 'cc0a9a1e-0000-4000-8000-000000000001';
const EVIDENCE_ID = 'dd0a9a1e-0000-4000-8000-000000000001';
const SOURCE_ID = 'ee0a9a1e-0000-4000-8000-000000000001';

function makeApplicationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: APPLICATION_ID,
    applicant_id: USER,
    job_id: 'job-1',
    status: 'reviewing',
    notes: 'Prepare SQL stories',
    resume_id: null,
    next_action: 'Send follow-up',
    next_action_due: null,
    job_title_snapshot: null,
    company_name_snapshot: null,
    source_snapshot: null,
    source_url_snapshot: null,
    location_snapshot: null,
    deadline_snapshot: null,
    external_id_snapshot: null,
    created_at: new Date(NOW - 5 * 86400000).toISOString(),
    updated_at: new Date(NOW - 86400000).toISOString(),
    job: {
      title: 'Graduate Analyst',
      location: 'Accra',
      employment_type: 'full-time',
      company_name: 'Acme Ghana',
      department: null,
      source: 'jobberman',
      source_url: 'https://example.com/jobs/1',
      application_deadline: new Date(NOW + 10 * 86400000).toISOString(),
      skills: ['SQL'],
      experience_level: 'entry',
      updated_at: new Date(NOW - 86400000).toISOString(),
    },
    ...overrides,
  };
}

function evidenceFixtures() {
  return {
    evidence_items: {
      data: [
        {
          id: EVIDENCE_ID,
          user_id: USER,
          category: 'work',
          title: 'Ledger rebuild',
          summary: 'Rebuilt the dues ledger for three terms.',
          occurred_on: null,
          review_status: 'confirmed',
          created_at: new Date(NOW - 86400000).toISOString(),
          updated_at: new Date(NOW - 86400000).toISOString(),
        },
      ],
      error: null,
    },
    evidence_sources: {
      data: [
        {
          id: SOURCE_ID,
          evidence_id: EVIDENCE_ID,
          user_id: USER,
          source_type: 'manual_note',
          resume_id: null,
          interview_id: null,
          entry_locator: null,
          source_label: 'Society minutes, March',
          source_excerpt: 'Approved the ledger rebuild.',
          source_url: null,
          created_at: new Date(NOW - 86400000).toISOString(),
          updated_at: new Date(NOW - 86400000).toISOString(),
        },
      ],
      error: null,
    },
    application_requirements: { data: [], error: null },
    application_evidence_links: { data: [], error: null },
    resume_evidence_links: { data: [], error: null },
  };
}

function renderDossier(applicationId = APPLICATION_ID) {
  return render(
    <MemoryRouter initialEntries={[`/applications/${applicationId}`]}>
      <Routes>
        <Route path="/applications/:applicationId" element={<ApplicationDossier />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
});

describe('Application Dossier page', () => {
  it('renders the dossier document with brief, factual rail, and all sections', async () => {
    installSupabaseMock({
      tables: {
        job_applications: { data: makeApplicationRow(), error: null },
        resumes: { data: [{ id: RESUME_ID, user_id: USER, title: 'Base CV', updated_at: new Date(NOW).toISOString() }], error: null },
        mock_interviews: { data: [{ id: INTERVIEW_ID, user_id: USER, application_id: APPLICATION_ID, job_role: 'Graduate Analyst practice', created_at: new Date(NOW).toISOString() }], error: null },
        ...evidenceFixtures(),
      },
      maybeSingle: {
        job_applications: { data: makeApplicationRow(), error: null },
      },
    });
    (supabase.rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
    renderDossier();

    expect(await screen.findByText('Graduate Analyst')).toBeTruthy();
    expect(screen.getByText('The role as recorded')).toBeTruthy();
    expect(screen.getByText('Accra')).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Application stages' })).toBeTruthy();
    // All sections are present on desktop.
    for (const title of [
      'Where the application stands',
      'What the role asks for',
      'What you can show',
      'Tailored application CV',
      'Practice records',
      'Human guidance for this application',
    ]) {
      expect(screen.getByText(title)).toBeTruthy();
    }
    // Saved notes hydrate into the editor.
    expect((screen.getByLabelText('Application notes') as HTMLTextAreaElement).value).toBe('Prepare SQL stories');
    // The linked interview session appears as a practice record.
    expect(screen.getByText('Graduate Analyst practice')).toBeTruthy();
  });

  it('shows a not-found state for a missing or foreign application', async () => {
    installSupabaseMock({
      maybeSingle: { job_applications: { data: null, error: null } },
    });
    (supabase.rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
    renderDossier();

    expect(await screen.findByText('Dossier not found')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back to applications' })).toBeTruthy();
  });

  it('lists evidence in the ledger with its derived stamp and sources', async () => {
    installSupabaseMock({
      tables: {
        job_applications: { data: makeApplicationRow(), error: null },
        resumes: { data: [], error: null },
        mock_interviews: { data: [], error: null },
        ...evidenceFixtures(),
      },
      maybeSingle: { job_applications: { data: makeApplicationRow(), error: null } },
    });
    (supabase.rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
    renderDossier();

    expect(await screen.findByText('Ledger rebuild')).toBeTruthy();
    expect(screen.getByText('Supported')).toBeTruthy();
    expect(screen.getByText('EV-DD0A9A')).toBeTruthy();
    expect(screen.getByText('Society minutes, March')).toBeTruthy();
  });

  it('renders mobile section navigation with a single active section', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    installSupabaseMock({
      tables: {
        job_applications: { data: makeApplicationRow(), error: null },
        resumes: { data: [], error: null },
        mock_interviews: { data: [], error: null },
        ...evidenceFixtures(),
      },
      maybeSingle: { job_applications: { data: makeApplicationRow(), error: null } },
    });
    (supabase.rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
    renderDossier();

    expect(await screen.findByText('Graduate Analyst')).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Dossier sections' })).toBeTruthy();
    // Only the active section's content is rendered; switching shows the next.
    expect(screen.queryByText('Where the application stands')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '02 Progress' }));
    expect(screen.getByText('Where the application stands')).toBeTruthy();
    expect(screen.queryByText('The role as recorded')).toBeNull();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
  });

  it('keeps a detached posting usable with a warning instead of failing', async () => {
    installSupabaseMock({
      tables: {
        job_applications: { data: makeApplicationRow({ job: null }), error: null },
        resumes: { data: [], error: null },
        mock_interviews: { data: [], error: null },
        ...evidenceFixtures(),
      },
      maybeSingle: { job_applications: { data: makeApplicationRow({ job: null }), error: null } },
    });
    (supabase.rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
    renderDossier();

    expect(await screen.findByText('The source posting is unavailable')).toBeTruthy();
    expect(screen.getAllByText('Tracked application').length).toBeGreaterThan(0);
  });
});
