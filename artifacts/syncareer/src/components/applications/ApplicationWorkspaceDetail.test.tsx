import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ApplicationWorkspaceDetail } from './ApplicationWorkspaceDetail';
import type { WorkspaceApplication } from '@/features/application-tracker/workspace';

const app: WorkspaceApplication = {
  id: 'app-1', job_id: null, status: 'pending', notes: 'Original note', resume_url: null,
  created_at: '2026-08-01', updated_at: '2026-08-10', job: null,
  resume_id: null, next_action: 'Follow up', next_action_due: '2026-08-10',
  job_title_snapshot: 'Durable Analyst', company_name_snapshot: 'Snapshot Co', source_snapshot: 'jobberman',
  source_url_snapshot: 'https://example.com/job', location_snapshot: 'Accra', deadline_snapshot: null,
  external_id_snapshot: 'source-1',
};

function renderDetail(overrides: Partial<React.ComponentProps<typeof ApplicationWorkspaceDetail>> = {}) {
  const props: React.ComponentProps<typeof ApplicationWorkspaceDetail> = {
    application: app,
    resumes: [{ id: 'cv-own', user_id: 'user-1', title: 'Submitted CV', updated_at: null }],
    interviews: [], statusSaving: false, notesState: 'idle', workspaceState: 'idle',
    onBack: vi.fn(), onStatus: vi.fn(), onNotes: vi.fn(), onWorkspace: vi.fn(), onInterviewLink: vi.fn(),
    ...overrides,
  };
  render(<MemoryRouter><ApplicationWorkspaceDetail {...props} /></MemoryRouter>);
  return props;
}

describe('ApplicationWorkspaceDetail', () => {
  beforeEach(() => Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 }));

  it('shows durable posting facts, overdue next action and linked-object empty states', () => {
    renderDetail();
    expect(screen.getAllByText('Durable Analyst').length).toBeGreaterThan(0);
    expect(screen.getByText('Snapshot Co · Accra')).toBeTruthy();
    expect(screen.getByText(/Overdue/)).toBeTruthy();
    expect(screen.getByText(/No CV linked/)).toBeTruthy();
    expect(screen.getByText(/No interview practice linked/)).toBeTruthy();
  });

  it('links and unlinks only through the explicit workspace handler', () => {
    const props = renderDetail();
    const trigger = screen.getByRole('combobox', { name: 'Linked CV' });
    fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' });
    fireEvent.click(screen.getByText('Submitted CV'));
    expect(props.onWorkspace).toHaveBeenCalledWith({ resume_id: 'cv-own' });
  });

  it('keeps a failed notes draft visible and offers retry', () => {
    const props = renderDetail({ notesState: 'failed' });
    fireEvent.change(screen.getByLabelText('Application notes'), { target: { value: 'Unsaved local draft' } });
    expect((screen.getByLabelText('Application notes') as HTMLTextAreaElement).value).toBe('Unsaved local draft');
    fireEvent.click(screen.getByRole('button', { name: /Retry save/i }));
    expect(props.onNotes).toHaveBeenCalledWith('Unsaved local draft');
    expect(screen.getByText(/changes are still here/i)).toBeTruthy();
  });

  it('uses a mobile full-detail view with tabs and a back action', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    const props = renderDetail();
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Back to applications/i }));
    expect(props.onBack).toHaveBeenCalledTimes(1);
  });
});
