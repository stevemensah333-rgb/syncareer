import type { ReactNode } from 'react';
import { CalendarClock, Compass, MapPin, NotebookPen, ShieldQuestion } from 'lucide-react';
import {
  ContextualPreview,
  PreviewCallout,
  PreviewContent,
  PreviewLine,
} from '@/components/ui/contextual-preview';
import {
  getApplicationNextAction,
  stageForStatus,
  statusLabel,
  STAGE_LABELS,
} from '@/features/application-tracker/workflow';
import {
  getDeadlineState,
  getOrganisation,
  getProvenanceFacts,
} from '@/features/opportunities/opportunity';
import { STATUS_COLORS } from '@/features/application-tracker/constants';
import type { TrackedApplication } from './ApplicationDetailSheet';
import { cn } from '@/lib/utils';

interface ApplicationRowPreviewProps {
  application: TrackedApplication;
  /** Whether the user has a saved CV; null = still unknown (loading/failed). */
  hasCv: boolean | null;
  /** The row trigger (button). Kept as a single focusable element. */
  children: ReactNode;
}

/**
 * Progressive-disclosure preview for a tracked application row, mirroring the
 * opportunity preview rules:
 * - hover-capable/fine-pointer devices only (touch activates the row's full
 *   detail sheet instead);
 * - opens on hover and keyboard focus, dismisses on Escape/blur/leave;
 * - read-only and non-focusable, collision-aware and viewport-capped;
 * - every fact here also appears in the full detail sheet.
 */
export function ApplicationRowPreview({ application, hasCv, children }: ApplicationRowPreviewProps) {
  const job = application.job;
  const organisation = job ? getOrganisation(job) : null;
  const deadline = getDeadlineState(job?.application_deadline);
  const stage = stageForStatus(application.status);
  const provenance = getProvenanceFacts(job ?? {});
  const nextAction = getApplicationNextAction({
    status: application.status,
    jobTitle: job?.title ?? null,
    jobMissing: job === null,
    deadlinePassed: deadline.kind === 'passed',
    hasCv,
    skills: job?.skills,
  });

  return (
    <ContextualPreview content={
      <PreviewContent>
        <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold leading-tight truncate">
                {job?.title || 'Tracked application'}
              </p>
              <span
                className={cn(
                  'shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                  STATUS_COLORS[application.status] ?? 'bg-muted text-muted-foreground',
                )}
              >
                {statusLabel(application.status)}
              </span>
            </div>
            {organisation && <p className="text-xs text-muted-foreground">{organisation}</p>}
          </div>

          <div className="space-y-1.5">
            <PreviewLine icon={<Compass className="h-3.5 w-3.5" />}>
              {stage
                ? `Journey stage: ${STAGE_LABELS[stage]}`
                : 'Status is outside the standard journey'}
            </PreviewLine>
            {job?.location && (
              <PreviewLine icon={<MapPin className="h-3.5 w-3.5" />}>{job.location}</PreviewLine>
            )}
            <PreviewLine icon={<CalendarClock className="h-3.5 w-3.5" />}>
              {deadline.label}
              {deadline.kind === 'passed' ? ' — confirm status on the source site' : ''}
            </PreviewLine>
            <PreviewLine icon={<NotebookPen className="h-3.5 w-3.5" />}>
              {application.notes
                ? application.notes.length > 120
                  ? `${application.notes.slice(0, 120)}…`
                  : application.notes
                : 'No notes yet'}
            </PreviewLine>
            {job && (
              <PreviewLine icon={<ShieldQuestion className="h-3.5 w-3.5" />}>
                Listing via {provenance.sourceLabel} · not verified
              </PreviewLine>
            )}
          </div>

          <PreviewCallout label="Next">{nextAction.title}</PreviewCallout>
        </PreviewContent>
      }
    >
      {children}
    </ContextualPreview>
  );
}
