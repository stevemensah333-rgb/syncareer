import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, FileText, Mic, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  relevantPostingsForMajor,
  skillMatches,
  type MarketGap,
  type MarketPosting,
} from '@/features/market-intelligence/derive';
import { MarketSection } from './shared';

interface Props {
  major: string;
  gaps: MarketGap[];
  postings: MarketPosting[];
  /** True while the user's profile and current postings are still loading. */
  loading: boolean;
}

/**
 * WHAT TO DO NEXT — practical next actions, relevant live opportunities, and
 * development/evidence actions. Opportunities are real current postings
 * filtered to the major's role family; the gap skills each one asks for are
 * cited so the user can connect "market asks for X" to a real role.
 */
export function NextActionsSection({ major, gaps, postings, loading }: Props) {
  const relevant = loading ? [] : relevantPostingsForMajor(postings, major, 4);
  const topGapSkills = loading ? [] : gaps.slice(0, 2).map((gap) => gap.skill.skill);

  const postingGaps = (posting: MarketPosting) =>
    topGapSkills.filter((skill) =>
      (posting.skills ?? []).some((listed) => skillMatches(listed, skill)),
    );

  return (
    <MarketSection
      id="next-actions"
      eyebrow="What to do next"
      title="Turn this market into your next move"
      description="Three practical moves, plus the live roles that match your field right now."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col justify-between rounded-surface border border-border bg-card p-4">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <Briefcase aria-hidden="true" className="size-4" />
              <p className="text-xs font-semibold text-foreground">Find matching roles</p>
            </div>
            <p className="type-meta mt-1.5 leading-5">
              Open roles filtered for {major}. Check which ones ask for your gap skills.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="mt-3 w-full justify-between">
            <Link to={`/opportunities?q=${encodeURIComponent(major)}`}>
              Browse opportunities
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </Button>
        </div>

        <div className="flex flex-col justify-between rounded-surface border border-border bg-card p-4">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <FileText aria-hidden="true" className="size-4" />
              <p className="text-xs font-semibold text-foreground">Build evidence</p>
            </div>
            <p className="type-meta mt-1.5 leading-5">
              {topGapSkills.length > 0
                ? `Add evidence for ${topGapSkills.join(' and ')} to your CV so the gap is covered.`
                : 'Add evidence for the skills this market asks for.'}
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="mt-3 w-full justify-between">
            <Link to="/cv-builder">
              Update your CV
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </Button>
        </div>

        <div className="flex flex-col justify-between rounded-surface border border-border bg-card p-4">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <Mic aria-hidden="true" className="size-4" />
              <p className="text-xs font-semibold text-foreground">Practise the conversation</p>
            </div>
            <p className="type-meta mt-1.5 leading-5">
              Rehearse entry-level {major} interview questions before you apply.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="mt-3 w-full justify-between">
            <Link to={`/interview-simulator?role=${encodeURIComponent(major)}`}>
              Practise interview
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold text-foreground">Relevant open opportunities</p>
        {relevant.length > 0 ? (
          <ul className="mt-2 divide-y divide-border-subtle">
            {relevant.map((posting) => {
              const asked = postingGaps(posting);
              return (
                <li key={posting.title} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm font-medium text-foreground">{posting.title}</span>
                  </div>
                  {asked.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="type-meta">asks for</span>
                      {asked.map((skill) => (
                        <Badge key={skill} variant="soft-warning">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : loading ? (
          <p className="type-secondary mt-1.5 text-xs">Loading your opportunities…</p>
        ) : (
          <p className="type-secondary mt-1.5 text-xs">
            No current open roles match {major} right now — check back on Opportunities, or widen
            your search.
          </p>
        )}
      </div>
    </MarketSection>
  );
}
