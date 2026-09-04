import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { MarketIntelligence } from '@/hooks/useMarketIntelligence';
import {
  REGION_CURRENCY,
  REGION_LABELS,
  commonRequirements,
  emergingRequirements,
  formatLocalSalary,
  parseGrowthPercent,
} from '@/features/market-intelligence/derive';
import { EstimateChip, MarketSection, TrendBadge } from './shared';

const CATEGORY_VARIANT: Record<string, 'soft-primary' | 'soft-success' | 'soft-warning' | 'soft-destructive' | 'soft-neutral'> = {
  Hot: 'soft-primary',
  Growing: 'soft-success',
  Trend: 'soft-primary',
  Alert: 'soft-warning',
  Emerging: 'soft-neutral',
};

interface Props {
  data: MarketIntelligence;
  major: string;
}

/**
 * MARKET SIGNAL — demand/trend, geography, common and emerging requirements,
 * and other trustworthy signals. Every figure carries the estimate marker; the
 * trend chart answers one question: is demand rising or falling?
 */
export function MarketSignalSection({ data, major }: Props) {
  const currency = REGION_CURRENCY[data.region] ?? 'USD';
  const regionLabel = REGION_LABELS[data.region] ?? data.region;
  const common = commonRequirements(data.hard_skills ?? []);
  const emerging = emergingRequirements(data.hard_skills ?? []);
  const forecast = data.demand_forecast ?? [];
  const remote = data.region.startsWith('remote_') || data.region === 'global';

  return (
    <MarketSection
      id="market-signal"
      eyebrow="Market signal"
      title="What is happening in this market"
      description={`Signals are local to ${regionLabel}. ${remote ? 'For remote and global benchmarks, figures are generalised and carry more uncertainty.' : ''}`}
    >
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Demand / trend */}
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Demand trend</p>
            <EstimateChip />
          </div>
          <p className="type-meta mt-0.5">
            12-month demand projection for {major} — direction only, not a forecast of exact hiring
            numbers.
          </p>
          {forecast.length >= 2 ? (
            <div
              className="mt-3 h-56"
              role="img"
              aria-label={`Estimated twelve-month demand projection. ${forecast
                .map((item) => `${item.month}: demand index ${item.demand_index} of 100, hiring activity ${item.hiring_activity} of 100`)
                .join('. ')}`}
            >
              <div aria-hidden="true" className="h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={forecast} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      isAnimationActive={false}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(value) => [`${value}/100`]}
                    />
                    <Line
                      isAnimationActive={false}
                      type="monotone"
                      dataKey="demand_index"
                      name="Demand index"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      isAnimationActive={false}
                      type="monotone"
                      dataKey="hiring_activity"
                      name="Hiring activity"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      dot={false}
                      activeDot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {(data.hard_skills ?? []).slice(0, 5).map((skill) => (
                <span key={skill.skill} className="inline-flex items-center gap-1.5">
                  <span className="text-xs font-medium">{skill.skill}</span>
                  <TrendBadge trend={skill.trend} />
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Geography + pay */}
        <div className="min-w-0 space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <MapPin aria-hidden="true" className="size-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Geography</p>
            </div>
            <p className="type-secondary mt-1 text-xs leading-5">
              This report is scoped to {regionLabel}. Local market insight is only shown where the
              region is a named market; benchmark regions are generalised.
            </p>
          </div>

          {data.salary_data.length > 0 && (
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">Estimated pay for common roles</p>
                <EstimateChip />
              </div>
              <p className="type-meta mt-0.5">
                Model estimates in {currency} per year — not verified salary data.
              </p>
              <ul className="mt-2 divide-y divide-border-subtle">
                {data.salary_data.map((role) => (
                  <li key={role.role} className="flex items-baseline justify-between gap-3 py-1.5">
                    <span className="min-w-0 truncate text-sm text-foreground">{role.role}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      entry {formatLocalSalary(role.entry_level_usd, currency)} · mid{' '}
                      {formatLocalSalary(role.mid_level_usd, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Common + emerging requirements */}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="rounded-surface border border-border bg-card p-4">
          <p className="text-sm font-semibold text-foreground">Common requirements</p>
          <p className="type-meta mt-0.5">Most frequently demanded, by estimated demand score.</p>
          {common.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {common.map((skill) => (
                <li key={skill.skill} className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">{skill.skill}</span>
                  <span className="flex items-center gap-2">
                    <span className="type-meta">{skill.demand_score}/100</span>
                    <TrendBadge trend={skill.trend} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="type-secondary mt-2 text-xs">No skill data for this market yet.</p>
          )}
        </div>

        <div className="rounded-surface border border-border bg-card p-4">
          <p className="text-sm font-semibold text-foreground">Emerging requirements</p>
          <p className="type-meta mt-0.5">Rising in demand but not yet among the most common.</p>
          {emerging.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {emerging.map((skill) => (
                <li key={skill.skill} className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">{skill.skill}</span>
                  <Badge variant="soft-success" className="gap-1">
                    <ArrowUpRight aria-hidden="true" className="size-3" />
                    {parseGrowthPercent(skill.growth_percent) != null
                      ? skill.growth_percent
                      : 'rising'}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="type-secondary mt-2 text-xs">
              No clearly emerging skills — most demand is in established skills.
            </p>
          )}
        </div>
      </div>

      {/* Other signals */}
      {data.market_insights.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-semibold text-foreground">Other signals</p>
          <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
            {data.market_insights.map((insight) => (
              <div key={insight.title} className="rounded-surface border border-border bg-card p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-snug text-foreground">{insight.title}</p>
                  <Badge variant={CATEGORY_VARIANT[insight.category] ?? 'soft-neutral'}>
                    {insight.category}
                  </Badge>
                </div>
                <p className="type-secondary mt-1 text-xs leading-5">{insight.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </MarketSection>
  );
}
