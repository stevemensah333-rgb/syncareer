import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { installSupabaseMock } from '@/test/supabaseMock';
import { supabase } from '@/integrations/supabase/client';
import ApplicationCVEditor from './ApplicationCVEditor';

vi.mock('@/components/layout/PageLayout', () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/hooks/useSupabaseUserId', () => ({
  useSupabaseUserId: () => '9f0a9a1e-0000-4000-8000-0000000000aa',
}));

const NOW = Date.now();
const USER = '9f0a9a1e-0000-4000-8000-0000000000aa';
const APPLICATION_ID = 'aa0a9a1e-0000-4000-8000-000000000001';
const RESUME_ID = 'bb0a9a1e-0000-4000-8000-000000000001';
const EVIDENCE_ID = 'dd0a9a1e-0000-4000-8000-000000000001';

function makeApplicationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: APPLICATION_ID,
    applicant_id: USER,
    job_id: 'job-1',
    status: 'pending',
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
      description: 'Analyse market data. SQL required.',
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

const emptyEvidence = {
  evidence_items: { data: [], error: null },
  evidence_sources: { data: [], error: null },
  application_requirements: { data: [], error: null },
  application_evidence_links: { data: [], error: null },
  resume_evidence_links: { data: [], error: null },
};

function renderEditor() {
  return render(
    <MemoryRouter initialEntries={[`/applications/${APPLICATION_ID}/cv`]}>
      <Routes>
        <Route path="/applications/:applicationId/cv" element={<ApplicationCVEditor />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
});

describe('Application CV editor page', () => {
  it('requires an explicit source CV before any copy is created', async () => {
    installSupabaseMock({
      tables: {
        job_applications: { data: makeApplicationRow(), error: null },
        resumes: { data: [{ id: RESUME_ID, user_id: USER, title: 'Base CV', updated_at: new Date(NOW).toISOString() }], error: null },
        ...emptyEvidence,
      },
      maybeSingle: { job_applications: { data: makeApplicationRow(), error: null } },
    });
    (supabase.rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
    renderEditor();

    expect(await screen.findByText('Create application CV')).toBeTruthy();
    expect(screen.getByText('Source CV')).toBeTruthy();
    // No clone happened on load: the RPC was never called.
    expect(supabase.rpc).not.toHaveBeenCalledWith('create_application_cv', expect.anything());
  });

  it('creates the application CV through the idempotent operation and loads the copy', async () => {
    installSupabaseMock({
      tables: {
        job_applications: { data: makeApplicationRow(), error: null },
        resumes: { data: [{ id: RESUME_ID, user_id: USER, title: 'Base CV', updated_at: new Date(NOW).toISOString() }], error: null },
        ...emptyEvidence,
      },
      maybeSingle: { job_applications: { data: makeApplicationRow(), error: null } },
    });
    (supabase.rpc as unknown as ReturnType<typeof vi.fn>).mockImplementation((fn: string) => {
      if (fn === 'create_application_cv') {
        return Promise.resolve({
          data: { id: RESUME_ID, title: 'Base CV', is_primary: false, document_scope: 'application', source_resume_id: RESUME_ID },
          error: null,
        });
      }
      return Promise.resolve({ data: [], error: null });
    });
    renderEditor();

    fireEvent.click(await screen.findByRole('combobox', { name: 'Source CV' }));
    fireEvent.click(screen.getByRole('option', { name: 'Base CV' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create application CV' }));

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('create_application_cv', {
        p_application_id: APPLICATION_ID,
        p_source_resume_id: RESUME_ID,
      });
    });
  });

  it('edits the linked application copy with the evidence shelf and requirement inspector', async () => {
    installSupabaseMock({
      tables: {
        job_applications: { data: makeApplicationRow({ resume_id: RESUME_ID }), error: null },
        resumes: {
          data: [
            {
              id: RESUME_ID,
              user_id: USER,
              title: 'Application copy',
              personal_info: {
                firstName: 'Ama',
                lastName: 'Mensah',
                email: 'ama@example.com',
                [('_syncareer')]: { version: 1, activities: [] },
              },
              education: [{ university: 'KNUST', location: 'Kumasi', degree: 'BSc', graduationDate: '2026', gpa: '' }],
              experience: [{ id: 'exp-1', company: 'Acme', location: '', date: '2025', role: 'Intern', bullets: ['Cleaned data'] }],
              projects: [],
              achievements: [],
              skills: ['SQL'],
              references_section: null,
            },
          ],
          error: null,
        },
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
        resume_evidence_links: { data: [], error: null },
      },
      maybeSingle: {
        job_applications: { data: makeApplicationRow({ resume_id: RESUME_ID }), error: null },
        resumes: {
          data: {
            id: RESUME_ID,
            personal_info: {
              firstName: 'Ama',
              lastName: 'Mensah',
              email: 'ama@example.com',
              [('_syncareer')]: { version: 1, activities: [] },
            },
            education: [{ university: 'KNUST', location: 'Kumasi', degree: 'BSc', graduationDate: '2026', gpa: '' }],
            experience: [{ id: 'exp-1', company: 'Acme', location: '', date: '2025', role: 'Intern', bullets: ['Cleaned data'] }],
            projects: [],
            achievements: [],
            skills: ['SQL'],
            references_section: null,
          },
          error: null,
        },
      },
    });
    (supabase.rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
    renderEditor();

    // The linked copy loads into the editor with the shelf and inspector.
    expect(await screen.findByLabelText('Evidence shelf')).toBeTruthy();
    expect(await screen.findByText('Ledger rebuild')).toBeTruthy();
    expect(await screen.findByText('Role requirements')).toBeTruthy();
    expect(screen.getAllByText('SQL').length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/First Name/)).toBeTruthy();
    expect((screen.getByLabelText(/First Name/) as HTMLInputElement).value).toBe('Ama');
    expect(screen.getByText('Application tailoring context')).toBeTruthy();
  });
});
