import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { RecordState } from '@/components/dossier';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useMarketIntelligence } from '@/hooks/useMarketIntelligence';
import { useMarketSignals } from '@/hooks/useMarketSignals';
import {
  buildMarketConclusion,
  deriveGaps,
  matchedWithEvidence,
} from '@/features/market-intelligence/derive';
import { MarketConclusion } from '@/components/analysis/MarketConclusion';
import { MarketSignalSection } from '@/components/analysis/MarketSignalSection';
import { EmployerDemandSection } from '@/components/analysis/EmployerDemandSection';
import { YourPositionSection } from '@/components/analysis/YourPositionSection';
import { YourGapsSection } from '@/components/analysis/YourGapsSection';
import { NextActionsSection } from '@/components/analysis/NextActionsSection';
import { AlumniOutcomesCard } from '@/components/analysis/AlumniOutcomesCard';
import { ProvenanceNote } from '@/components/analysis/shared';

const REGIONS = [
  { value: 'accra_ghana', label: 'Accra, Ghana' },
  { value: 'lagos_nigeria', label: 'Lagos, Nigeria' },
  { value: 'nairobi_kenya', label: 'Nairobi, Kenya' },
  { value: 'cape_town_sa', label: 'Cape Town, SA' },
  { value: 'remote_africa', label: 'Remote (Africa-friendly)' },
  { value: 'remote_global', label: 'Remote (Global)' },
  { value: 'global', label: 'Global benchmark' },
];

/**
 * Market Intelligence — a decision-support surface, not a dashboard.
 *
 * It answers one question — "what is happening in this market, and what does
 * it mean for me?" — in that order: market conclusion (with the user
 * implication, largest gap and next action first on mobile), then market
 * signal, employer demand, position, gaps, and next actions.
 *
 * All market figures are AI estimates: provenance, confidence and freshness
 * are shown up front and every figure carries an "AI estimate" marker.
 */
const Analysis = () => {
  const navigate = useNavigate();
  const { studentDetails, loading: profileLoading } = useUserProfile();
  const major = studentDetails?.major ?? null;
  const university = studentDetails?.school ?? null;
  const [region, setRegion] = useState('accra_ghana');

  const { data, loading, error, refresh } = useMarketIntelligence(major ?? undefined, region);
  const { signals, loading: signalsLoading, partial: signalsPartial } = useMarketSignals(Boolean(major));

  const conclusion = useMemo(
    () => (data ? buildMarketConclusion(data, signals) : null),
    [data, signals],
  );
  const matched = useMemo(
    () => (data ? matchedWithEvidence(data.hard_skills ?? [], signals.recordedSkills) : []),
    [data, signals],
  );
  const gaps = useMemo(
    () => (data ? deriveGaps(data.hard_skills ?? [], signals.recordedSkills, signals.postings) : []),
    [data, signals],
  );

  if (profileLoading) {
    return (
      <PageLayout title="Market Intelligence">
        <div className="flex h-64 items-center justify-center">
          <div className="space-y-2 text-center">
            <Spinner className="mx-auto size-6 text-primary" />
            <p className="text-sm text-muted-foreground">Loading your profile…</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!major) {
    return (
      <PageLayout title="Market Intelligence">
        <div className="mx-auto mt-12 max-w-lg">
          <RecordState
            tone="empty"
            title="Add your major to read this market"
            description="Market Intelligence turns your field into a decision: what's happening, what employers ask for, where you stand, and what to do next. It needs your major to do that."
            action={
              <Button size="sm" onClick={() => navigate('/settings?tab=profile')}>
                Add your major in Settings
              </Button>
            }
          />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Market Intelligence"
      description={`What is happening in the market for ${major} — and what it means for you.`}
    >
      <div className="layout-section">
        {/* 1. The conclusion first — what's happening and what it means for you. */}
        {data && conclusion && !loading && (
          <MarketConclusion
            data={data}
            conclusion={conclusion}
            major={major}
            regions={REGIONS}
            region={region}
            onRegionChange={setRegion}
            loading={loading}
            onRefresh={refresh}
            onExport={() => window.print()}
            personalizationLoading={signalsLoading}
          />
        )}

        {/* Honest provenance, always near the top so figures are read in context. */}
        {data && !loading && <ProvenanceNote data={data} major={major} />}

        {signalsPartial && !loading && (
          <RecordState
            tone="warning"
            title="Some of your details could not be loaded"
            description="The market report is shown, but your position, gaps and next actions may be incomplete. Retry when you have a moment."
          />
        )}

        {/* Market data error */}
        {error && !loading && (
          <RecordState
            tone="error"
            title="Market intelligence could not be loaded"
            description={error}
            action={
              <Button size="sm" variant="outline" onClick={refresh}>
                Try again
              </Button>
            }
          />
        )}

        {/* Loading skeleton */}
        {loading && (
          <div aria-busy="true" aria-label="Loading market intelligence" className="space-y-4">
            <div className="discover-hero h-44 animate-pulse motion-reduce:animate-none" />
            <div className="grid gap-3 sm:grid-cols-2">
              {[0, 1].map((index) => (
                <div
                  key={index}
                  className="h-40 animate-pulse rounded-surface-lg border border-border bg-muted/30 motion-reduce:animate-none"
                />
              ))}
            </div>
          </div>
        )}

        {data && !loading && (
          <>
            <MarketSignalSection data={data} major={major} />
            <EmployerDemandSection data={data} />
            <YourPositionSection matched={matched} signals={signals} loading={signalsLoading} />
            <YourGapsSection gaps={gaps} major={major} loading={signalsLoading} />
            <NextActionsSection major={major} gaps={gaps} postings={signals.postings} loading={signalsLoading} />

            <AlumniOutcomesCard university={university} major={major} region={region} />
          </>
        )}
      </div>
    </PageLayout>
  );
};

export default Analysis;
