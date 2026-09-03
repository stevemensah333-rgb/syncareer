import type { ReactNode } from 'react';
import { Bookmark, BookmarkCheck, Briefcase, CalendarClock, ExternalLink, GraduationCap, MapPin, ShieldQuestion } from 'lucide-react';
import {
  ContextualPreview,
  PreviewContent,
  PreviewLine,
} from '@/components/ui/contextual-preview';
import {
  experienceLevelLabel,
  formatPostedAgo,
  getDeadlineState,
  getOrganisation,
  getProvenanceFacts,
  getWorkModeLabel,
  type MatchedOpportunityJob,
} from '@/features/opportunities/opportunity';
import { statusLabel, type ApplicationRef } from '@/features/application-tracker/workflow';
import type { FitExplanation } from '@/features/opportunities/fit';
import {
  PreviewCallout,
} from '@/components/ui/contextual-preview';

interface OpportunityPreviewProps {
  job: MatchedOpportunityJob;
  saved: boolean;
  application: ApplicationRef | null;
  /** Real-evidence fit explanation, when one exists for this profile. */
  fit?: FitExplanation | null;
  /** The row trigger (button). Kept as a single focusable element. */
  children: ReactNode;
}

/**
 * Progressive-disclosure preview for an opportunity row.
 *
 * - Attached only on hover-capable, fine-pointer devices; it opens on hover
 *   AND on keyboard focus (Radix behaviour), and dismisses on Escape,
 *   pointer-leave, or blur.
 * - Read-only and non-focusable: every fact shown here also appears in the
 *   full detail view, which touch and keyboard users reach by activating
 *   the row. No information is hover-only.
 * - Collision-aware (`avoidCollisions` + padding) and width-capped so it
 *   stays inside the viewport and opens over the detail pane side rather
 *   than covering the list's controls.
 */
export function OpportunityPreview({ job, saved, application, fit, children }: OpportunityPreviewProps) {
  const organisation = getOrganisation(job);
  const deadline = getDeadlineState(job.application_deadline);
  const level = experienceLevelLabel(job.experience_level);
  const workMode = getWorkModeLabel(job);
  const provenance = getProvenanceFacts(job);
  const posted = formatPostedAgo(job.created_at);

  const nextHint = application
    ? `In your tracker · ${statusLabel(application.status)}`
    : deadline.kind === 'passed'
      ? 'Deadline listed as passed — confirm on the source site before applying'
      : job.is_external && job.source_url
        ? `Apply on ${provenance.sourceLabel}, then mark it here to track progress`
        : 'Apply with Syncareer to start tracking';

  return (
    <ContextualPreview content={
        <PreviewContent>
          <div className="space-y-0.5">
            <p className="text-sm font-semibold leading-tight">{job.title}</p>
            {organisation && <p className="text-xs text-muted-foreground">{organisation}</p>}
          </div>

          {fit && (
            <PreviewCallout label={fit.label}>
              <span className="block">{fit.reasons.map((reason) => reason.text).join(' · ')}</span>
              {fit.gaps.length > 0 && (
                <span className="mt-1 block text-muted-foreground">
                  Not recorded: {fit.gaps.map((gap) => gap.skill).join(', ')}
                </span>
              )}
            </PreviewCallout>
          )}

          <div className="space-y-1.5">
            <PreviewLine icon={<MapPin className="h-3.5 w-3.5" />}>
              {job.location}
              {workMode ? ` · ${workMode}` : ''}
              <span className="capitalize"> · {job.employment_type}</span>
            </PreviewLine>
            <PreviewLine icon={<CalendarClock className="h-3.5 w-3.5" />}>
              {deadline.label}
            </PreviewLine>
            <PreviewLine icon={<GraduationCap className="h-3.5 w-3.5" />}>
              {level ?? 'Experience level not specified'}
            </PreviewLine>
            <PreviewLine icon={<ShieldQuestion className="h-3.5 w-3.5" />}>
              via {provenance.sourceLabel}
              {posted ? ` · added ${posted}` : ''} · not independently verified
            </PreviewLine>
            <PreviewLine
              icon={
                application ? (
                  <Briefcase className="h-3.5 w-3.5" />
                ) : saved ? (
                  <BookmarkCheck className="h-3.5 w-3.5" />
                ) : (
                  <Bookmark className="h-3.5 w-3.5" />
                )
              }
            >
              {application ? nextHint : saved ? `Saved · ${nextHint}` : nextHint}
            </PreviewLine>
          </div>

          {provenance.sourceUrl && (
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground/80">
              <ExternalLink className="h-3 w-3" />
              Original posting on {provenance.sourceLabel}
            </p>
          )}
        </PreviewContent>
      }
    >
      {children}
    </ContextualPreview>
  );
}
