import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { OpportunityPreview } from './OpportunityPreview';
import type { MatchedOpportunityJob } from '@/features/opportunities/opportunity';

function makeJob(overrides: Partial<MatchedOpportunityJob> = {}): MatchedOpportunityJob {
  return {
    id: 'job-1',
    title: 'Graduate Software Engineer',
    department: null,
    location: 'Accra',
    employment_type: 'full-time',
    salary_min: null,
    salary_max: null,
    salary_currency: null,
    description: 'Build things.',
    requirements: null,
    skills: ['TypeScript'],
    created_at: new Date().toISOString(),
    employer_id: null,
    source: 'jobberman',
    source_url: 'https://example.com/jobs/1',
    is_external: true,
    application_deadline: new Date(Date.now() + 10 * 86400000).toISOString(),
    company_name: 'Acme Ghana',
    company_domain: null,
    experience_level: 'entry',
    external_id: null,
    status: 'active',
    updated_at: new Date().toISOString(),
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

beforeAll(() => {
  // jsdom lacks ResizeObserver (used by floating-ui for popper positioning).
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

describe('OpportunityPreview progressive disclosure', () => {
  it('renders the plain row on touch devices (tap opens the full detail instead)', () => {
    setHoverCapable(false);
    render(
      <OpportunityPreview job={makeJob()} saved={false} application={null}>
        <button>Select opportunity</button>
      </OpportunityPreview>,
    );
    const row = screen.getByRole('button', { name: 'Select opportunity' });
    fireEvent.focus(row);
    fireEvent.pointerEnter(row);
    // No hovercard content ever mounts without hover capability — touch users
    // go straight to the full detail via the row's own click behaviour.
    expect(screen.queryByText(/not verified/i)).toBeNull();
  });

  it('reveals deadline, eligibility, provenance and next action on focus/mouse hover', async () => {
    setHoverCapable(true);
    render(
      <OpportunityPreview job={makeJob()} saved={true} application={null}>
        <button>Select opportunity</button>
      </OpportunityPreview>,
    );
    const row = screen.getByRole('button', { name: 'Select opportunity' });
    fireEvent.focus(row);
    fireEvent.mouseEnter(row);

    const provenance = await screen.findByText(/not independently verified/i, undefined, { timeout: 2000 });
    expect(provenance).toBeTruthy();
    expect(screen.getByText(/Entry level/i)).toBeTruthy();
    expect(screen.getByText(/Deadline/i)).toBeTruthy();
    expect(screen.getByText(/Apply on Jobberman/i)).toBeTruthy();
    expect(screen.getByText(/Saved/)).toBeTruthy();
  }, 5000);

  it('shows tracked state and status instead of apply guidance when already tracked', async () => {
    setHoverCapable(true);
    render(
      <OpportunityPreview
        job={makeJob({ application_deadline: null })}
        saved={false}
        application={{ id: 'app-1', status: 'interview' }}
      >
        <button>Select opportunity</button>
      </OpportunityPreview>,
    );
    const row = screen.getByRole('button', { name: 'Select opportunity' });
    fireEvent.focus(row);
    fireEvent.mouseEnter(row);

    const tracked = await screen.findByText(/In your tracker · Interview/i, undefined, { timeout: 2000 });
    expect(tracked).toBeTruthy();
    // missing deadline is explicit, never fabricated
    expect(screen.getByText(/No deadline listed/i)).toBeTruthy();
  }, 5000);

  it('warns about an expired deadline rather than implying the role is open', async () => {
    setHoverCapable(true);
    render(
      <OpportunityPreview
        job={makeJob({
          application_deadline: new Date(Date.now() - 2 * 86400000).toISOString(),
        })}
        saved={false}
        application={null}
      >
        <button>Select opportunity</button>
      </OpportunityPreview>,
    );
    const row = screen.getByRole('button', { name: 'Select opportunity' });
    fireEvent.focus(row);
    fireEvent.mouseEnter(row);

    const expired = await screen.findByText(/Deadline listed as passed/i, undefined, { timeout: 2000 });
    expect(expired).toBeTruthy();
  }, 5000);
});
