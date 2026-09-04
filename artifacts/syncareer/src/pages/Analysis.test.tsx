import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { MarketIntelligence } from '@/hooks/useMarketIntelligence';
import type { MarketUserSignals } from '@/features/market-intelligence/derive';
import { EMPTY_SIGNALS } from '@/features/market-intelligence/derive';
import Analysis from './Analysis';

vi.mock('@/components/layout/PageLayout', () => ({
  PageLayout: ({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
      {children}
    </div>
  ),
}));

vi.mock('@/components/analysis/AlumniOutcomesCard', () => ({
  AlumniOutcomesCard: () => <div data-testid="alumni-outcomes">Alumni outcomes</div>,
}));

const profileHolder = vi.hoisted(() => ({
  studentDetails: {
    year_of_admission: 2022,
    expected_completion: 2026,
    major: 'Computer Science',
    school: 'University of Ghana',
    degree_type: 'BSc',
  } as { year_of_admission: number | null; expected_completion: number | null; major: string; school: string | null; degree_type: string } | null,
  loading: false,
}));

vi.mock('@/contexts/UserProfileContext', () => ({
  useUserProfile: () => profileHolder,
}));

const marketHolder = vi.hoisted(() => ({
  data: null as MarketIntelligence | null,
  loading: false,
  error: null as string | null,
  refresh: vi.fn(),
}));

vi.mock('@/hooks/useMarketIntelligence', () => ({
  useMarketIntelligence: () => marketHolder,
}));

const signalsHolder = vi.hoisted(() => ({
  signals: {
    recordedSkills: [],
    interests: [],
    activeApplications: 0,
    applicationsByStatus: {},
    savedRoleTitles: [],
    postings: [],
  } as MarketUserSignals,
  loading: false,
  partial: false,
}));

vi.mock('@/hooks/useMarketSignals', () => ({
  useMarketSignals: () => signalsHolder,
}));

function makeIntelligence(overrides: Partial<MarketIntelligence> = {}): MarketIntelligence {
  return {
    major: 'Computer Science',
    region: 'accra_ghana',
    hard_skills: [
      { skill: 'Python', demand_score: 90, growth_percent: '+8%', trend: 'rising', avg_entry_salary_usd: 0, job_posting_volume: 'high' },
      { skill: 'SQL', demand_score: 80, growth_percent: '+2%', trend: 'stable', avg_entry_salary_usd: 0, job_posting_volume: 'high' },
      { skill: 'Docker', demand_score: 60, growth_percent: '+12%', trend: 'rising', avg_entry_salary_usd: 0, job_posting_volume: 'medium' },
    ],
    soft_skills: [{ skill: 'Communication', demand_score: 70, context: 'Explaining technical work to non-engineers.', trend: 'stable' }],
    salary_data: [{ role: 'Junior Software Engineer', entry_level_usd: 24000, mid_level_usd: 48000, senior_level_usd: 96000, yoe_to_senior: 5 }],
    demand_forecast: [
      { month: 'Jan', demand_index: 40, hiring_activity: 40 },
      { month: 'Dec', demand_index: 70, hiring_activity: 60 },
    ],
    career_outlook: [],
    market_insights: [{ title: 'Fintech hiring is steady', description: 'Local fintech firms keep hiring entry-level engineers.', category: 'Trend', impact: 'medium' }],
    region_summary: 'Entry-level software roles are concentrated in fintech and banking.',
    data_confidence: 'medium',
    generated_at: '2026-09-04T10:00:00Z',
    from_cache: true,
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/analysis']}>
      <Analysis />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  profileHolder.studentDetails = {
    year_of_admission: 2022,
    expected_completion: 2026,
    major: 'Computer Science',
    school: 'University of Ghana',
    degree_type: 'BSc',
  };
  profileHolder.loading = false;
  marketHolder.data = makeIntelligence();
  marketHolder.loading = false;
  marketHolder.error = null;
  signalsHolder.signals = EMPTY_SIGNALS;
  signalsHolder.loading = false;
  signalsHolder.partial = false;
});

describe('Market Intelligence (decision-support)', () => {
  it('opens with the conclusion, provenance, and the personalisation sections', () => {
    signalsHolder.signals = {
      ...EMPTY_SIGNALS,
      recordedSkills: [{ name: 'python', proficiency: 'intermediate' }],
      postings: [{ title: 'Backend Engineer', skills: ['Python', 'Docker'] }],
    };
    renderPage();

    // Conclusion + provenance (source, methodology, freshness).
    expect(screen.getByText(/How this is produced/)).toBeTruthy();
    expect(screen.getByText(/not live job-posting counts/)).toBeTruthy();
    expect(screen.getAllByText(/4 Sep 2026/).length).toBeGreaterThan(0);
    expect(screen.getByText(/served from 7-day cache/)).toBeTruthy();
    expect(screen.getAllByText('AI estimate').length).toBeGreaterThan(0);

    // Position and gaps from real recorded data.
    expect(screen.getByText(/recorded · intermediate/)).toBeTruthy();
    expect(screen.getAllByText(/Docker/).length).toBeGreaterThan(0);

    // Decision-support sections and next actions.
    expect(screen.getByText('What is happening in this market')).toBeTruthy();
    expect(screen.getByText('Skills employers ask for most')).toBeTruthy();
    expect(screen.getByText('Where you stand in this market')).toBeTruthy();
    expect(screen.getByText('Turn this market into your next move')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Find matching roles/ })).toBeTruthy();

    // No fabricated "readiness" claims.
    expect(screen.queryByText(/% ready/)).toBeNull();
  });

  it('prompts for a major when none is set', () => {
    profileHolder.studentDetails = null;
    renderPage();
    expect(screen.getByText('Add your major to read this market')).toBeTruthy();
  });

  it('shows a retryable error when market data cannot load', () => {
    marketHolder.data = null;
    marketHolder.loading = false;
    marketHolder.error = 'AI generation failed';
    renderPage();
    expect(screen.getByText('Market intelligence could not be loaded')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Try again/ })).toBeTruthy();
  });

  it('shows a loading skeleton while the report is fetched', () => {
    marketHolder.data = null;
    marketHolder.loading = true;
    renderPage();
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it('waits for personalisation before claiming a position', () => {
    signalsHolder.loading = true;
    renderPage();
    expect(screen.getByText(/Connecting this market to your profile/)).toBeTruthy();
  });

  it('warns when personalisation is partial instead of silently misreading the user', () => {
    signalsHolder.partial = true;
    renderPage();
    expect(screen.getByText('Some of your details could not be loaded')).toBeTruthy();
  });
});
