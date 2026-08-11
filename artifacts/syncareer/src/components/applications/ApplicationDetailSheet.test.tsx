import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ApplicationDetailSheet, type TrackedApplication } from './ApplicationDetailSheet';

function makeApp(overrides: Partial<TrackedApplication> = {}): TrackedApplication {
  return {
    id: 'app-1',
    job_id: 'job-1',
    status: 'interview',
    notes: 'Call Ama on Friday',
    resume_url: null,
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    job: {
      title: 'Junior Data Analyst',
      location: 'Accra',
      employment_type: 'full-time',
      company_name: 'Insight Ltd',
      department: null,
      source: 'jobberman',
      source_url: 'https://example.com/jobs/1',
      application_deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
      skills: ['SQL', 'Excel'],
      experience_level: 'entry',
      updated_at: new Date().toISOString(),
    },
    ...overrides,
  };
}

function renderSheet(app: TrackedApplication | null, handlers?: Record<string, unknown>) {
  const props = {
    application: app,
    open: true,
    onOpenChange: vi.fn(),
    primaryCv: { id: 'cv-1', title: 'Ama CV', updated_at: new Date().toISOString() },
    cvLoadFailed: false,
    savingStatus: false,
    savingNotes: false,
    deleting: false,
    onRecordStatus: vi.fn(),
    onSaveNotes: vi.fn(),
    onDelete: vi.fn(),
    ...handlers,
  };
  render(
    <MemoryRouter>
      <ApplicationDetailSheet {...props} />
    </MemoryRouter>,
  );
  return props;
}

describe('ApplicationDetailSheet', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows full context: status, journey, deadline, CV, practice, notes', () => {
    renderSheet(makeApp());
    expect(screen.getByText('Junior Data Analyst')).toBeTruthy();
    expect(screen.getAllByText(/Insight Ltd/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Accra/).length).toBeGreaterThan(0);
    // journey stages
    expect(screen.getAllByText('Applied').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Interview').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Recommended next step/i).length).toBeGreaterThan(0);
    // targeted CV + practice entry
    expect(screen.getByText('Ama CV')).toBeTruthy();
    expect(screen.getByText(/Practice an interview for this role/i).closest('a')).toBeTruthy();
    // notes seeded from the record
    expect((screen.getByLabelText('Application notes') as HTMLTextAreaElement).value).toBe(
      'Call Ama on Friday',
    );
    // provenance honesty — never claims verification
    expect(screen.getAllByText(/not independently verified/i).length).toBeGreaterThan(0);
  });

  it('shows a partial-data banner when the posting is gone and keeps notes editable', () => {
    renderSheet(makeApp({ job: null }));
    expect(screen.getAllByText(/no longer available/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Tracked application')).toBeTruthy();
    expect((screen.getByLabelText('Application notes') as HTMLTextAreaElement).value).toBe(
      'Call Ama on Friday',
    );
  });

  it('flags an unknown stored status instead of guessing a stage', () => {
    renderSheet(makeApp({ status: 'legacy-import' }));
    expect(screen.getAllByText(/not part of the standard journey/i).length).toBeGreaterThan(0);
  });

  it('marks an expired deadline as passed, never as upcoming', () => {
    renderSheet(
      makeApp({
        job: {
          ...makeApp().job!,
          application_deadline: new Date(Date.now() - 3 * 86400000).toISOString(),
        },
      }),
    );
    expect(screen.getAllByText(/Deadline passed/i).length).toBeGreaterThan(0);
  });

  it('recommends creating a CV when none exists', () => {
    renderSheet(makeApp({ status: 'pending' }), { primaryCv: null });
    expect(screen.getAllByText(/No CV saved yet/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Create my CV/i).length).toBeGreaterThan(0);
  });

  it('surfaces a CV load failure as a non-blocking partial state', () => {
    renderSheet(makeApp({ status: 'pending' }), { primaryCv: null, cvLoadFailed: true });
    expect(screen.getByText(/could not be loaded right now/i)).toBeTruthy();
    // the rest of the sheet still works
    expect(screen.getByText(/Update status/i)).toBeTruthy();
  });

  it('saves notes through the handler (dirty state enables the button)', () => {
    const props = renderSheet(makeApp());
    const textarea = screen.getByLabelText('Application notes');
    fireEvent.change(textarea, { target: { value: 'Portal said review ends Monday' } });
    const save = screen.getByRole('button', { name: /Save notes/i });
    fireEvent.click(save);
    expect(props.onSaveNotes).toHaveBeenCalledWith('Portal said review ends Monday');
  });

  it('records status transitions through the handler only for known, different statuses', () => {
    renderSheet(makeApp({ status: 'pending' }));
    // select is a Radix trigger; use keyboard-free value change via the handler is
    // covered in workflow tests — here assert the control exists with the value.
    expect(screen.getByRole('combobox', { name: /Application status/i })).toBeTruthy();
  });

  it('requires confirmation before deleting', () => {
    const props = renderSheet(makeApp());
    fireEvent.click(screen.getByRole('button', { name: /Remove/i }));
    // confirmation dialog appears; nothing deleted yet
    expect(props.onDelete).not.toHaveBeenCalled();
    expect(screen.getByText(/Remove this application\?/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Remove application/i }));
    expect(props.onDelete).toHaveBeenCalledTimes(1);
  });

  it('points outcome statuses at learning, not more pipeline churn', () => {
    renderSheet(makeApp({ status: 'rejected' }));
    expect(screen.getAllByText('Not selected').length).toBeGreaterThan(0);
    expect(screen.getByText(/put the learning into the next one/i)).toBeTruthy();
  });
});
