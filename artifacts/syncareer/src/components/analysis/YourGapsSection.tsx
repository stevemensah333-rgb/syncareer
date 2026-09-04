import { Link } from 'react-router-dom';
import { ArrowRight, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MarketGap } from '@/features/market-intelligence/derive';
import { MarketSection } from './shared';

interface Props {
  gaps: MarketGap[];
  major: string;
  /** True while the user's recorded skills are still loading. */
  loading: boolean;
}

/**
 * YOUR GAPS — demanded skills the student has not recorded, ranked by demand.
 * Framed as "not recorded in Syncareer", never as a claim about ability.
 */
export function YourGapsSection({ gaps, major, loading }: Props) {
  if (loading) {
    return (
      <MarketSection
        id="your-gaps"
        eyebrow="Your gaps"
        title="What this market asks for that isn't on your profile"
        description="Demanded skills not recorded in your profile or CV."
      >
        <p className="type-secondary text-sm">Loading your profile data…</p>
      </MarketSection>
    );
  }

  return (
    <MarketSection
      id="your-gaps"
      eyebrow="Your gaps"
      title="What this market asks for that isn't on your profile"
      description="These skills are demanded in this market but not recorded in your profile or CV. “Not recorded” is a gap in your evidence, not a judgement on your ability."
    >
      {gaps.length > 0 ? (
        <ul className="divide-y divide-border-subtle">
          {gaps.map(({ skill, postingCount }) => (
            <li key={skill.skill} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <Target aria-hidden="true" className="size-4 shrink-0 text-warning" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{skill.skill}</p>
                  <p className="type-meta">
                    demanded {skill.demand_score}/100
                    {postingCount > 0
                      ? ` · ${postingCount} open ${postingCount === 1 ? 'role mentions' : 'roles mention'} it`
                      : ' · no current open roles mention it'}
                  </p>
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="gap-1.5">
                <Link to="/cv-builder">
                  Add evidence
                  <ArrowRight aria-hidden="true" className="size-3.5" />
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-3">
          <p className="type-secondary text-sm">
            You record every skill this market currently asks for. Check back as the market shifts,
            or aim for the next tier of skills below.
          </p>
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link to={`/opportunities?q=${encodeURIComponent(major)}`}>
              Browse matching roles
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </Button>
        </div>
      )}
    </MarketSection>
  );
}
