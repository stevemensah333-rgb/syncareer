import type { ReactNode } from 'react';
import { Bookmark, BookmarkCheck, Briefcase, CalendarClock, ExternalLink, GraduationCap, MapPin, ShieldQuestion } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { useHoverCapability } from '@/hooks/useHoverCapability';
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

interface OpportunityPreviewProps {
  job: MatchedOpportunityJob;
  saved: boolean;
  application: ApplicationRef | null;
  /** The row trigger (button). Kept as a single focusable element. */
  children: ReactNode;
}

function PreviewLine({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-xs text-muted-foreground">
      <span className="mt-0.5 shrink-0 text-foreground/70">{icon}</span>
      <span className="min-w-0">{children}</span>
    </p>
  );
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
export function OpportunityPreview({ job, saved, application, children }: OpportunityPreviewProps) {
  const canHover = useHoverCapability();

  if (!canHover) return <>{children}</>;

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
    <HoverCard openDelay={250} closeDelay={120}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side="right"
        align="start"
        sideOffset={10}
        collisionPadding={16}
        className="hidden w-80 max-w-[calc(100vw-2rem)] lg:block"
      >
        <div className="space-y-3">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold leading-tight">{job.title}</p>
            {organisation && <p className="text-xs text-muted-foreground">{organisation}</p>}
          </div>

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
              {posted ? ` · posted ${posted}` : ''} · not verified
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

          {(job.matchedSkills.length > 0 || job.missingSkills.length > 0) && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{job.matchPercentage}% match</span>
              {job.matchedSkills.length > 0 ? ` · ${job.matchedSkills.length} skill${job.matchedSkills.length > 1 ? 's' : ''} matched` : ''}
              {job.missingSkills.length > 0 ? ` · ${job.missingSkills.length} to develop` : ''}
            </p>
          )}

          {provenance.sourceUrl && (
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground/80">
              <ExternalLink className="h-3 w-3" />
              Original posting on {provenance.sourceLabel}
            </p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
