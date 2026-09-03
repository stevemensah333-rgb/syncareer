import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
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
    application_requirements: { data: [] as Array<Record<string, unknown>>, error: null },
    application_evidence_links: { data: [] as Array<Record<string, unknown>>, error: null },
    resume_evidence_links: { data: [] as Array<Record<string, unknown>>, error: null },
  };
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

function renderDossier(applicationId = APPLICATION_ID, search = '') {
  return render(
    <MemoryRouter initialEntries={[`/applications/${applicationId}${search}`]}>
      <LocationProbe />
      <Routes>
        <Route path="/applications/:applicationId" element={<ApplicationDossier />} />
      </Routes>
    </MemoryRouter>,
  );
}

const REQUIREMENT_ID = 'fa0a9a1e-0000-4000-8000-000000000001';
const LINK_ID = 'fa0a9a1e-0000-4000-8000-000000000002';
const SECOND_REQUIREMENT_ID = 'fa0a9a1e-0000-4000-8000-000000000003';

function requirementRow(id: string, label: string, detail: string, sortOrder: number) {
  return {
    id,
    application_id: APPLICATION_ID,
    user_id: USER,
    label,
    detail,
    origin: 'posting_skill' as const,
    sort_order: sortOrder,
    created_at: new Date(NOW).toISOString(),
    updated_at: new Date(NOW).toISOString(),
  };
}

function installLinkedDossier(requirements: Array<Record<string, unknown>>, links: Array<Record<string, unknown>>) {
  const evidence = evidenceFixtures();
  evidence.application_requirements.data = requirements;
  evidence.application_evidence_links.data = links;
  installSupabaseMock({
    tables: {
      job_applications: { data: makeApplicationRow(), error: null },
      resumes: { data: [], error: null },
      mock_interviews: { data: [], error: null },
      ...evidence,
    },
    maybeSingle: { job_applications: { data: makeApplicationRow(), error: null } },
  });
  (supabase.rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
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

    expect((await screen.findAllByText('Graduate Analyst')).length).toBeGreaterThan(0);
    expect(screen.getByText('The role as recorded')).toBeTruthy();
    expect(screen.getByText('Accra')).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Application stages' })).toBeTruthy();
    // All sections are present on desktop.
    for (const title of [
      'Where the application stands',
      'Requirements',
      'Evidence',
      'CV',
      'Interview',
      'Mentor',
    ]) {
      expect(screen.getAllByText(title).length).toBeGreaterThan(0);
    }
    // Saved notes hydrate into the editor.
    expect((screen.getByLabelText('Application notes') as HTMLTextAreaElement).value).toBe('Prepare SQL stories');
    // The linked interview session appears as a practice record.
    expect(screen.getByText('Graduate Analyst practice')).toBeTruthy();
    // The progress strip renders the stage rail and coverage facts.
    expect(screen.getByRole('list', { name: 'Stage progress' })).toBeTruthy();
    expect(screen.getByText('No requirements recorded')).toBeTruthy();
    expect(screen.getByText('1 of 1 ready')).toBeTruthy();
    expect(screen.getByText('Not linked')).toBeTruthy();
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

    expect((await screen.findAllByText('Ledger rebuild')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Supported').length).toBeGreaterThan(0);
    expect(screen.getAllByText('EV-DD0A9A').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Society minutes, March').length).toBeGreaterThan(0);
  });

  it('shows evidence context and updates it for a selected evidence record', async () => {
    const evidence = evidenceFixtures();
    evidence.application_requirements.data = [
      {
        id: 'fa0a9a1e-0000-4000-8000-000000000001',
        application_id: APPLICATION_ID,
        user_id: USER,
        label: 'SQL reporting',
        detail: 'Build and explain reporting queries.',
        origin: 'posting_skill' as const,
        sort_order: 0,
        created_at: new Date(NOW).toISOString(),
        updated_at: new Date(NOW).toISOString(),
      },
    ];
    evidence.application_evidence_links.data = [
      {
        id: 'fa0a9a1e-0000-4000-8000-000000000002',
        requirement_id: 'fa0a9a1e-0000-4000-8000-000000000001',
        evidence_id: EVIDENCE_ID,
        user_id: USER,
        relevance_note: 'Explains the dashboard',
        created_at: new Date(NOW).toISOString(),
      },
    ];
    installSupabaseMock({
      tables: {
        job_applications: { data: makeApplicationRow(), error: null },
        resumes: { data: [], error: null },
        mock_interviews: { data: [], error: null },
        ...evidence,
      },
      maybeSingle: { job_applications: { data: makeApplicationRow(), error: null } },
    });
    (supabase.rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
    renderDossier();

    expect(await screen.findByText('Evidence ready')).toBeTruthy();
    expect(screen.getAllByText('SQL reporting').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Show context for Ledger rebuild' }));
    expect(await screen.findByText('Ready to use')).toBeTruthy();
    expect(screen.getAllByText('Relevance: Explains the dashboard').length).toBeGreaterThan(0);
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
    expect(screen.getByRole('navigation', { name: 'Application sections' })).toBeTruthy();
    // Only the active section's content is rendered; switching shows the next.
    expect(screen.queryByText('Where the application stands')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
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

  it('honours a focus URL parameter pointing at evidence', async () => {
    installLinkedDossier(
      [requirementRow(REQUIREMENT_ID, 'SQL reporting', 'Build and explain reporting queries.', 0)],
      [
        {
          id: LINK_ID,
          requirement_id: REQUIREMENT_ID,
          evidence_id: EVIDENCE_ID,
          user_id: USER,
          relevance_note: 'Explains the dashboard',
          created_at: new Date(NOW).toISOString(),
        },
      ],
    );
    renderDossier(APPLICATION_ID, `?focus=evidence%3A${EVIDENCE_ID}`);

    // "Ready to use" is only shown when the evidence record itself is the
    // selection; the default requirement selection would say "Evidence ready".
    expect(await screen.findByText('Ready to use')).toBeTruthy();
    expect(screen.getAllByText('Relevance: Explains the dashboard').length).toBeGreaterThan(0);
    expect(screen.getByText('1 of 1 requirements supported')).toBeTruthy();
  });

  it('selecting a requirement updates the inspector and the URL state', async () => {
    installLinkedDossier(
      [
        requirementRow(REQUIREMENT_ID, 'SQL reporting', 'Build and explain reporting queries.', 0),
        requirementRow(SECOND_REQUIREMENT_ID, 'Written communication', 'Explain findings clearly.', 1),
      ],
      [
        {
          id: LINK_ID,
          requirement_id: REQUIREMENT_ID,
          evidence_id: EVIDENCE_ID,
          user_id: USER,
          relevance_note: 'Explains the dashboard',
          created_at: new Date(NOW).toISOString(),
        },
      ],
    );
    renderDossier();

    // The first requirement is selected by default.
    expect(await screen.findByText('Evidence ready')).toBeTruthy();
    // Selecting the second requirement swaps the inspector immediately.
    fireEvent.click(screen.getByRole('button', { name: /^Requirement Written communication/ }));
    expect(await screen.findByText('No evidence yet')).toBeTruthy();
    // The selection is written to the URL so it survives refresh and sharing.
    await waitFor(() => {
      const search = screen.getByTestId('location-search').textContent ?? '';
      expect(search).toContain('focus=requirement');
      expect(search).toContain(SECOND_REQUIREMENT_ID);
    });
    // Screen readers hear the context change.
    expect(screen.getByText(/Inspecting requirement Written communication/)).toBeTruthy();
  });

  it('the inspector next step focuses the matching requirement control', async () => {
    installLinkedDossier(
      [requirementRow(REQUIREMENT_ID, 'SQL reporting', 'Build and explain reporting queries.', 0)],
      [],
    );
    renderDossier();

    // The requirement has no evidence, so the inspector offers one next step.
    const nextStep = await screen.findByRole('button', { name: 'Link evidence' });
    fireEvent.click(nextStep);
    await waitFor(() => {
      expect(document.activeElement?.id).toBe(`dossier-link-${REQUIREMENT_ID}`);
    });
  });

  it('opens the evidence sheet from a requirement on compact layouts', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    installLinkedDossier(
      [requirementRow(REQUIREMENT_ID, 'SQL reporting', 'Build and explain reporting queries.', 0)],
      [],
    );
    renderDossier();

    // Switch to the requirements section, then select the requirement.
    fireEvent.click(await screen.findByRole('button', { name: 'Requirements' }));
    fireEvent.click(await screen.findByRole('button', { name: /Requirement SQL reporting/ }));
    // The inspector opens as a sheet with the selected requirement context.
    expect(await screen.findByRole('heading', { name: 'Evidence context' })).toBeTruthy();
    expect(screen.getByText('No evidence yet')).toBeTruthy();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
  });
});
