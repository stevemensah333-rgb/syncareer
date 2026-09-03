import { ArrowRight, ArrowUpRight, Building2, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { OpportunityJob } from '@/features/opportunities/opportunity';
import {
  getDeadlineState,
  getOrganisation,
  getWorkModeLabel,
  experienceLevelLabel,
  deadlineIsUrgent,
} from '@/features/opportunities/opportunity';

interface OpportunitySpotlightProps {
  jobs: OpportunityJob[];
  /** Short, honest line describing which real signals ordered the list. */
  rankingSummary: string | null;
  error: boolean;
}

/**
 * Featured opportunities as decision objects. Each card shows only what helps
 * the student decide whether to engage: role, organisation, location/mode,
 * experience level, and deadline urgency. All fields come straight from the
 * listing — nothing is claimed as "verified" or invented.
 */
export function OpportunitySpotlight({ jobs, rankingSummary, error }: OpportunitySpotlightProps) {
  if (error) return null;

  return (
    <section aria-labelledby="opportunity-spotlight-title" className="discover-enter" style={{ animationDelay: '240ms' }}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="opportunity-spotlight-title" className="type-section-title">
            Opportunities for you
          </h2>
          {rankingSummary && <p className="type-meta mt-0.5 truncate">{rankingSummary}</p>}
        </div>
        <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
          <Link to="/opportunities">
            Browse all <ArrowRight aria-hidden="true" className="ml-1 size-3.5" />
          </Link>
        </Button>
      </div>

      {jobs.length === 0 ? (
        <div className="discover-object p-5">
          <p className="text-sm font-medium text-foreground">No new opportunities to feature right now</p>
          <p className="type-secondary mt-1">
            You are already tracking or have saved the closest matches. Browse the full list to widen
            your search.
          </p>
          <div className="mt-4">
            <Button variant="outline" size="sm" asChild className="gap-1.5">
              <Link to="/opportunities">
                Browse opportunities <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-3">
          {jobs.map((job) => {
            const org = getOrganisation(job);
            const workMode = getWorkModeLabel(job);
            const level = experienceLevelLabel(job.experience_level);
            const deadline = getDeadlineState(job.application_deadline);
            const showDeadline = deadline.kind !== 'none' && deadline.kind !== 'passed';
            const urgent = deadlineIsUrgent(deadline);
            return (
              <li key={job.id}>
                <Link
                  to={`/opportunities?job=${encodeURIComponent(job.id)}`}
                  className="discover-object h-full p-4"
                  aria-label={`${job.title}${org ? `, ${org}` : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold leading-snug text-foreground">{job.title}</p>
                    <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                  </div>

                  {org && (
                    <p className="mt-1.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                      <Building2 aria-hidden="true" className="size-3.5 shrink-0" />
                      {org}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {job.location && (
                      <span className="inline-flex items-center gap-1 rounded-control border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        <MapPin aria-hidden="true" className="size-3" />
                        {job.location}
                      </span>
                    )}
                    {workMode && (
                      <span className="rounded-control border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        {workMode}
                      </span>
                    )}
                    {level && (
                      <span className="rounded-control border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        {level}
                      </span>
                    )}
                  </div>

                  {showDeadline && (
                    <p
                      className={`mt-3 text-[11px] font-semibold ${urgent ? 'text-warning' : 'text-muted-foreground'}`}
                    >
                      {deadline.label}
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default OpportunitySpotlight;
