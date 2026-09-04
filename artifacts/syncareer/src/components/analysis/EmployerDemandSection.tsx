import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { MarketIntelligence } from '@/hooks/useMarketIntelligence';
import { decliningSkills, parseGrowthPercent } from '@/features/market-intelligence/derive';
import { EstimateChip, MarketSection, TrendBadge } from './shared';

interface Props {
  data: MarketIntelligence;
}

const MAX_LABEL = 16;
const truncate = (value: string) => (value.length > MAX_LABEL ? `${value.slice(0, MAX_LABEL - 1)}…` : value);

/**
 * WHAT EMPLOYERS ARE ASKING FOR — skill frequency (one comparison chart),
 * meaningful changes, and the interpersonal requirements that sit alongside
 * the technical skills.
 */
export function EmployerDemandSection({ data }: Props) {
  const skills = [...(data.hard_skills ?? [])].sort((a, b) => b.demand_score - a.demand_score);
  const rising = skills.filter((skill) => skill.trend === 'rising');
  const declining = decliningSkills(skills);
  const chartData = skills.map((skill) => ({ skill: truncate(skill.skill), demand: skill.demand_score }));

  return (
    <MarketSection
      id="employer-demand"
      eyebrow="What employers are asking for"
      title="Skills employers ask for most"
      description="Estimated demand score per skill for this market. Higher means employers mention it more often — a relative ranking, not a measured count."
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,1fr)]">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Skill frequency</p>
            <EstimateChip />
          </div>
          {skills.length === 0 ? (
            <p className="type-secondary mt-2 text-xs">No skill demand data for this market yet.</p>
          ) : (
            <div
              className="mt-3 h-[300px]"
              role="img"
              aria-label={`Estimated skill demand. ${skills
                .map((skill) => `${skill.skill}: ${skill.demand_score} of 100`)
                .join('. ')}`}
            >
              <div aria-hidden="true" className="h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="skill"
                      width={118}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))' }}
                      isAnimationActive={false}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(value) => [`${value}/100`, 'Demand']}
                    />
                    <Bar dataKey="demand" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-foreground">Meaningful changes</p>
            {rising.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {rising.slice(0, 3).map((skill) => (
                  <li key={skill.skill} className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
                      <ArrowUpRight aria-hidden="true" className="size-3.5 text-success" />
                      {skill.skill}
                    </span>
                    <span className="type-meta">
                      {parseGrowthPercent(skill.growth_percent) != null ? skill.growth_percent : 'rising'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {declining.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {declining.slice(0, 3).map((skill) => (
                  <li key={skill.skill} className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-sm text-foreground-secondary">
                      <ArrowDownRight aria-hidden="true" className="size-3.5 text-destructive" />
                      {skill.skill}
                    </span>
                    <span className="type-meta">
                      {parseGrowthPercent(skill.growth_percent) != null ? skill.growth_percent : 'declining'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {rising.length === 0 && declining.length === 0 && (
              <p className="type-secondary mt-1.5 text-xs">No notable skill-level changes signalled.</p>
            )}
          </div>

          {data.soft_skills.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-foreground">Beyond the technical skills</p>
              <ul className="mt-2 space-y-2.5">
                {data.soft_skills.map((skill) => (
                  <li key={skill.skill} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">{skill.skill}</span>
                      <TrendBadge trend={skill.trend} />
                    </div>
                    {skill.context && (
                      <p className="type-meta leading-5">{skill.context}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </MarketSection>
  );
}
