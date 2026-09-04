import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Download,
  MapPin,
  RefreshCw,
  Target,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MarketIntelligence } from '@/hooks/useMarketIntelligence';
import {
  formatReportDate,
  REGION_LABELS,
  type MarketConclusion as MarketConclusionType,
} from '@/features/market-intelligence/derive';

const DIRECTION_LABEL = {
  rising: 'rising',
  stable: 'holding steady for',
  declining: 'cooling for',
  null: 'changing for',
} as const;

interface Props {
  data: MarketIntelligence;
  conclusion: MarketConclusionType;
  major: string;
  regions: Array<{ value: string; label: string }>;
  region: string;
  onRegionChange: (region: string) => void;
  loading: boolean;
  onRefresh: () => void;
  onExport: () => void;
  /** True while the user's recorded skills/applications are still loading. */
  personalizationLoading: boolean;
}

/**
 * The page's answer, not a chart. Opens with the market conclusion and the
 * user implication (position → gap → next action), so mobile users get the
 * whole story before any chart.
 */
export function MarketConclusion({
  data,
  conclusion,
  major,
  regions,
  region,
  onRegionChange,
  loading,
  onRefresh,
  onExport,
  personalizationLoading,
}: Props) {
  const regionLabel = REGION_LABELS[region] ?? region;
  const direction = DIRECTION_LABEL[conclusion.direction ?? 'null'];
  const hasMatches = conclusion.matched.length > 0;
  const gap = conclusion.topGap;

  return (
    <section className="discover-hero" aria-labelledby="market-conclusion-title">
      <div className="relative p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="type-label text-primary">Market intelligence · {regionLabel}</p>
            <h2
              id="market-conclusion-title"
              className="mt-1.5 max-w-2xl text-[22px] font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-[26px]"
            >
              Demand is {direction} entry-level {major} roles in {regionLabel}.
            </h2>
            {conclusion.marketState && (
              <p className="type-secondary mt-2 max-w-2xl">{conclusion.marketState}</p>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Select value={region} onValueChange={onRegionChange}>
              <SelectTrigger className="h-9 w-[170px]" aria-label="Market region">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {regions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={onExport} disabled={loading} className="gap-1.5">
              <Download aria-hidden="true" className="size-3.5" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading} className="gap-1.5">
              <RefreshCw
                aria-hidden="true"
                className={`size-3.5 ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="inline-flex items-center gap-1.5 type-meta">
            <BarChart3 aria-hidden="true" className="size-3.5 text-primary" />
            <span className="font-medium text-foreground">
              {formatReportDate(data.generated_at)}
            </span>
            <span>{data.from_cache ? ' · from cache' : ' · fresh'}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 type-meta">
            <MapPin aria-hidden="true" className="size-3.5" />
            {regionLabel}
          </span>
        </div>

        {/* What it means for you — position, gap, next action (mobile-first order). */}
        {personalizationLoading ? (
          <p className="type-secondary mt-6 text-sm">Connecting this market to your profile…</p>
        ) : (
          <div className="mt-6 grid gap-3 lg:grid-cols-3">
            <div className="rounded-surface border border-border bg-card/80 p-4">
              <p className="type-label">Your position</p>
              {hasMatches ? (
                <>
                  <p className="mt-1.5 text-sm leading-5 text-foreground">
                    You already record {conclusion.matched.length} of the top demanded skills.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {conclusion.matched.map((skill) => (
                      <Badge key={skill} variant="soft-success" className="gap-1">
                        <BadgeCheck aria-hidden="true" className="size-3" />
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </>
              ) : (
                <p className="mt-1.5 text-sm leading-5 text-foreground-secondary">
                  None of this market&apos;s top skills are recorded in your profile yet — so there is
                  no position to show. Record skills to see yours.
                </p>
              )}
              {conclusion.interestLabels.length > 0 && (
                <p className="type-meta mt-2">
                  Interests on file: {conclusion.interestLabels.join(', ')}.
                </p>
              )}
            </div>

            <div className="rounded-surface border border-border bg-card/80 p-4">
              <p className="type-label">Your largest gap</p>
              {gap ? (
                <>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Target aria-hidden="true" className="size-4 shrink-0 text-warning" />
                    <p className="text-sm font-semibold text-foreground">{gap.skill}</p>
                  </div>
                  <p className="mt-1 text-sm leading-5 text-foreground-secondary">
                    {gap.postingCount > 0
                      ? `${gap.postingCount} open ${gap.postingCount === 1 ? 'role mentions' : 'roles mention'} it right now.`
                      : 'No current open roles mention it yet.'}
                  </p>
                </>
              ) : (
                <p className="mt-1.5 text-sm leading-5 text-foreground-secondary">
                  You record every top demanded skill. Aim for the next tier below.
                </p>
              )}
            </div>

            <div className="rounded-surface border border-primary/25 bg-selected/60 p-4">
              <p className="type-label text-primary">What to do next</p>
              <div className="mt-2.5 flex flex-col gap-2">
                <Button asChild size="sm" className="w-full justify-between">
                  <Link to={`/opportunities?q=${encodeURIComponent(major)}`}>
                    Find matching roles
                    <ArrowRight aria-hidden="true" className="size-3.5" />
                  </Link>
                </Button>
                {gap && (
                  <Button asChild size="sm" variant="outline" className="w-full justify-between">
                    <Link to="/cv-builder">
                      Add evidence for {gap.skill}
                      <ArrowRight aria-hidden="true" className="size-3.5" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
