import { BadgeCheck, Bookmark, Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { MarketUserSignals, MatchedSkill } from '@/features/market-intelligence/derive';
import { MarketSection } from './shared';

const ACTIVE_STATUS_LABEL: Record<string, string> = {
  pending: 'pending',
  reviewing: 'in review',
  shortlisted: 'shortlisted',
  interview: 'in interview',
  offered: 'offered',
};

interface Props {
  matched: MatchedSkill[];
  signals: MarketUserSignals;
  /** True while the user's recorded skills/applications are still loading. */
  loading: boolean;
}

/**
 * YOUR POSITION — only what is actually recorded: demanded skills the student
 * has on file (with their stored proficiency label as evidence), interests,
 * and current application/saved-role context. No invented scores.
 */
export function YourPositionSection({ matched, signals, loading }: Props) {
  if (loading) {
    return (
      <MarketSection
        id="your-position"
        eyebrow="Your position"
        title="Where you stand in this market"
        description="Based only on what is recorded in your profile, CV and applications."
      >
        <p className="type-secondary text-sm">Loading your profile data…</p>
      </MarketSection>
    );
  }

  const activeStatuses = Object.entries(signals.applicationsByStatus)
    .filter(([status, count]) => ACTIVE_STATUS_LABEL[status] && count > 0)
    .map(([status, count]) => `${count} ${ACTIVE_STATUS_LABEL[status]}`);

  return (
    <MarketSection
      id="your-position"
      eyebrow="Your position"
      title="Where you stand in this market"
      description="Based only on what is recorded in your profile, CV and applications. Recorded is not the same as verified — it means Syncareer has it on file."
    >
      {matched.length > 0 ? (
        <ul className="divide-y divide-border-subtle">
          {matched.map(({ market, recorded }) => (
            <li key={market.skill} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <BadgeCheck aria-hidden="true" className="size-4 shrink-0 text-success" />
                <span className="text-sm font-medium text-foreground">{market.skill}</span>
                <span className="type-meta">
                  demanded {market.demand_score}/100
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="soft-success" className="capitalize">
                  recorded · {recorded.proficiency || 'listed'}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="type-secondary text-sm">
          None of this market&apos;s demanded skills are recorded in your profile or CV yet. Add
          skills to your CV and profile to see your position.
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-surface border border-border-subtle bg-surface-secondary/50 p-3.5">
          <div className="flex items-center gap-2">
            <Briefcase aria-hidden="true" className="size-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Current applications</p>
          </div>
          <p className="type-secondary mt-1 text-xs leading-5">
            {signals.activeApplications > 0
              ? `You are tracking ${signals.activeApplications} active ${signals.activeApplications === 1 ? 'application' : 'applications'}${
                  activeStatuses.length > 0 ? ` (${activeStatuses.join(', ')})` : '.'
                }`
              : 'No active applications are being tracked yet.'}
          </p>
        </div>

        <div className="rounded-surface border border-border-subtle bg-surface-secondary/50 p-3.5">
          <div className="flex items-center gap-2">
            <Bookmark aria-hidden="true" className="size-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Roles you&apos;re watching</p>
          </div>
          {signals.savedRoleTitles.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {signals.savedRoleTitles.map((title) => (
                <Badge key={title} variant="soft-neutral">
                  {title}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="type-secondary mt-1 text-xs leading-5">
              No saved roles yet — save roles you&apos;re aiming at to keep them here.
            </p>
          )}
        </div>
      </div>

      {signals.interests.length > 0 && (
        <p className="type-meta mt-3">
          Assessment interests on file: {signals.interests.join(', ')}. Interests indicate the kind
          of work you&apos;re drawn to — they don&apos;t measure skill.
        </p>
      )}
    </MarketSection>
  );
}
