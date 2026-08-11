import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ApplicationRowPreview } from './ApplicationRowPreview';
import type { TrackedApplication } from './ApplicationDetailSheet';

function makeApp(overrides: Partial<TrackedApplication> = {}): TrackedApplication {
  return {
    id: 'app-1',
    job_id: 'job-1',
    status: 'reviewing',
    notes: 'Follow up after the panel',
    resume_url: null,
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    job: {
      title: 'Graduate Analyst',
      location: 'Accra',
      employment_type: 'full-time',
      company_name: 'Acme Ghana',
      department: null,
      source: 'jobberman',
      source_url: 'https://example.com/jobs/1',
      application_deadline: new Date(Date.now() + 6 * 86400000).toISOString(),
      skills: ['SQL'],
      experience_level: 'entry',
      updated_at: new Date().toISOString(),
    },
    ...overrides,
  };
}

function setHoverCapable(matches: boolean) {
  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

function renderPreview(app: TrackedApplication) {
  return render(
    <MemoryRouter>
      <ApplicationRowPreview application={app} hasCv={true}>
        <button>Open application</button>
      </ApplicationRowPreview>
    </MemoryRouter>,
  );
}

beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (window as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
});

beforeEach(() => {
  cleanup();
});

describe('ApplicationRowPreview', () => {
  it('renders the plain row on touch devices', () => {
    setHoverCapable(false);
    renderPreview(makeApp());
    const row = screen.getByRole('button', { name: 'Open application' });
    fireEvent.focus(row);
    fireEvent.pointerEnter(row);
    expect(screen.queryByText(/Journey stage/i)).toBeNull();
  });

  it('reveals stage, deadline, next step, notes and provenance on focus/hover', async () => {
    setHoverCapable(true);
    renderPreview(makeApp());
    const row = screen.getByRole('button', { name: 'Open application' });
    fireEvent.focus(row);
    fireEvent.mouseEnter(row);

    expect(await screen.findByText(/Journey stage: In review/i, undefined, { timeout: 2000 })).toBeTruthy();
    expect(screen.getByText(/Follow up after the panel/)).toBeTruthy();
    expect(screen.getByText(/not verified/i)).toBeTruthy();
    expect(screen.getByText(/Recruiter is reviewing/i)).toBeTruthy();
  }, 5000);

  it('handles a deleted posting honestly in the preview', async () => {
    setHoverCapable(true);
    renderPreview(makeApp({ job: null }));
    const row = screen.getByRole('button', { name: 'Open application' });
    fireEvent.focus(row);
    fireEvent.mouseEnter(row);

    expect(await screen.findByText(/Original posting unavailable/i, undefined, { timeout: 2000 })).toBeTruthy();
  }, 5000);
});
