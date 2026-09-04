import { memo } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  ExternalLink,
  MapPin,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

import { Button } from '@/components/ui/button';
import { CompanyLogo } from './CompanyLogo';
import { DeadlinePill } from './DeadlinePill';
import {
  formatPostedAgo,
  getDeadlineState,
  getOpportunityCta,
  getOrganisation,
  getProvenanceFacts,
  getWorkModeLabel,
  type MatchedOpportunityJob,
} from '@/features/opportunities/opportunity';
import type { FitExplanation } from '@/features/opportunities/fit';
import { statusLabel, type ApplicationRef } from '@/features/application-tracker/workflow';
import { OpportunityPreview } from './OpportunityPreview';

interface OpportunityCardProps {
  job: MatchedOpportunityJob;
  fit: FitExplanation | null;
  saved: boolean;
  saving: boolean;
  bookmarkDisabled: boolean;
  tracking: boolean;
  application: ApplicationRef | null;
  selected: boolean;
  onOpen: () => void;
  onRowKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>, jobId: string) => void;
  onToggleSave: () => void;
  onTrack: () => void;
}

/**
 * One opportunity as a Discover-mode decision object.
 *
 * Structure (Deliberately non-dossier):
 * - the body carries identity, role facts, the fit explanation (only real
 *   evidence), and the role's own skills;
 * - a full-card overlay button owns click/keyboard selection and the
 *   contextual preview (hover/focus only, everything also in the detail view);
 * - the footer holds the two real actions: the primary next step and Save.
 *
 * The trigger is intentionally a separate overlay rather than a wrapping
 * <button> so the card can contain real buttons without nested-interactive
 * markup, and visible headings without phrasal-content violations.
 */
export const OpportunityCard = memo(function OpportunityCard({
  job,
  fit,
  saved,
  saving,
  bookmarkDisabled,
  tracking,
  application,
  selected,
  onOpen,
  onRowKeyDown,
  onToggleSave,
  onTrack,
}: OpportunityCardProps) {
  const organisation = getOrganisation(job);
  const deadline = getDeadlineState(job.application_deadline);
  const workMode = getWorkModeLabel(job);
  const provenance = getProvenanceFacts(job);
  const posted = formatPostedAgo(job.created_at);
  const cta = getOpportunityCta({
    isExternal: job.is_external,
    hasSourceUrl: Boolean(job.source_url),
    tracked: application !== null,
  });
  const listedSkills = job.skills ?? [];
  const visibleSkills = listedSkills.slice(0, 3);
  const remainingSkills = listedSkills.length - visibleSkills.length;
  const openLabel = `${job.title}${organisation ? ` at ${organisation}` : ''}. Open details.`;

  return (
    <article
      className="discover-object relative"
      data-interactive="true"
      data-emphasis={selected ? 'true' : undefined}
    >
      <div className="flex flex-col p-4 pb-3">
        {/* Company + role identity */}
        <div className="flex items-start gap-3">
          <CompanyLogo job={job} size={44} />
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold leading-snug text-foreground">{job.title}</h3>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {organisation ?? 'Organisation not specified'}
            </p>
          </div>
        </div>

        {/* Location / arrangement / type */}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex min-w-0 items-center gap-1">
            <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">{job.location}</span>
          </span>
          {workMode && <span>{workMode}</span>}
          <span className="capitalize">{job.employment_type}</span>
        </div>

        {/* Fit explanation — real evidence only, never a percentage */}
        {fit && (
          <div className="mt-3 rounded-control border border-accent/70 bg-accent p-2.5">
            <p className="text-xs font-semibold text-accent-foreground">{fit.label}</p>
            <ul className="mt-1 space-y-0.5">
              {fit.reasons.map((reason) => (
                <li key={reason.source} className="text-xs leading-5 text-muted-foreground">
                  {reason.text}
                </li>
              ))}
            </ul>
            {fit.gaps.length > 0 && (
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                <span className="font-medium text-foreground-secondary">Not recorded:</span>{' '}
                {fit.gaps.map((gap) => gap.skill).join(', ')}
                <span className="text-muted-foreground/80"> — verify before you apply</span>
              </p>
            )}
          </div>
        )}

        {/* The role's own skills, kept to a decision-sized subset */}
        {visibleSkills.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {visibleSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-control border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {skill}
              </span>
            ))}
            {remainingSkills > 0 && (
              <span className="text-[11px] text-muted-foreground">+{remainingSkills} more</span>
            )}
          </div>
        )}

        {/* Deadline + provenance — quiet, factual */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {deadline.kind === 'none' ? (
            <span className="text-xs text-muted-foreground">Deadline not listed</span>
          ) : (
            <DeadlinePill state={deadline} />
          )}
          <span className="text-[11px] text-muted-foreground">
            via {provenance.sourceLabel}
            {posted ? ` · added ${posted}` : ''}
          </span>
          {application && (
            <span className="rounded-control border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium text-foreground-secondary">
              Tracking · {statusLabel(application.status)}
            </span>
          )}
        </div>
      </div>

      {/* Full-card selection trigger + contextual preview (hover/focus only) */}
      <OpportunityPreview job={job} saved={saved} application={application} fit={fit}>
        <button
          type="button"
          onClick={onOpen}
          onKeyDown={(event) => onRowKeyDown(event, job.id)}
          data-opportunity-id={job.id}
          aria-label={openLabel}
          aria-current={selected ? 'true' : undefined}
          className="absolute inset-x-0 bottom-[calc(var(--control-height-sm)+1.25rem)] top-0 z-10 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none"
        />
      </OpportunityPreview>

      {/* Actions — primary next step + save */}
      <div className="relative z-20 flex items-center justify-between gap-2 border-t border-border px-3 py-2.5">
        <OpportunityPrimaryAction
          cta={cta}
          job={job}
          application={application}
          tracking={tracking}
          onTrack={onTrack}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0"
          onClick={onToggleSave}
          disabled={saving || bookmarkDisabled}
          aria-label={saved ? `Unsave ${job.title}` : `Save ${job.title}`}
          aria-pressed={saved}
        >
          {saving ? (
            <Spinner className="size-4" />
          ) : saved ? (
            <BookmarkCheck aria-hidden="true" className="size-4 text-primary" />
          ) : (
            <Bookmark aria-hidden="true" className="size-4" />
          )}
          {saved && <span className="sr-only">Saved</span>}
        </Button>
      </div>
    </article>
  );
});

function OpportunityPrimaryAction({
  cta,
  job,
  application,
  tracking,
  onTrack,
}: {
  cta: ReturnType<typeof getOpportunityCta>;
  job: MatchedOpportunityJob;
  application: ApplicationRef | null;
  tracking: boolean;
  onTrack: () => void;
}) {
  if (cta === 'open-tracker' && application) {
    return (
      <Button size="sm" variant="secondary" className="gap-1.5" asChild>
        <Link to={`/applications?application=${encodeURIComponent(application.id)}`}>
          <Briefcase aria-hidden="true" className="size-4" />
          Open in tracker
        </Link>
      </Button>
    );
  }
  if (cta === 'apply-external') {
    const source = job.source?.trim() || 'the source site';
    return (
      <Button size="sm" className="gap-1.5" asChild>
        <a
          href={job.source_url ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Apply on ${source}`}
        >
          <ExternalLink aria-hidden="true" className="size-4" />
          Apply
        </a>
      </Button>
    );
  }
  if (cta === 'source-unavailable') {
    return (
      <Button size="sm" variant="outline" className="gap-1.5" onClick={onTrack} disabled={tracking}>
        {tracking ? (
          <Spinner className="size-4" />
        ) : (
          <CheckCircle2 aria-hidden="true" className="size-4" />
        )}
        {tracking ? 'Starting tracking' : 'Mark as applied'}
      </Button>
    );
  }
  return (
    <Button
      size="sm"
      className="gap-1.5"
      onClick={onTrack}
      disabled={tracking}
      aria-label="Apply with Syncareer"
    >
      {tracking ? (
        <Spinner className="size-4" />
      ) : (
        <Briefcase aria-hidden="true" className="size-4" />
      )}
      {tracking ? 'Starting tracking' : 'Apply'}
    </Button>
  );
}
