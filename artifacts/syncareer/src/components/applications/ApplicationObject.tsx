import { ArrowRight, CalendarClock, FileText, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { STATUS_BADGE_VARIANT } from '@/features/application-tracker/constants';
import type { ApplicationSummary } from '@/features/application-tracker/applicationIndex';
import { cn } from '@/lib/utils';

/**
 * One application as a composed object, not a table row:
 *
 *   opportunity → stage → next action → evidence/CV state → metadata
 *
 * Only recorded facts render. Evidence coverage is omitted when the
 * application has no requirements mapped; the CV line is omitted when no
 * application CV is linked.
 */

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function relativeDay(iso: string, now: number): string {
  const days = Math.floor((now - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return formatDay(iso);
}

interface EvidenceMeterProps {
  supported: number;
  total: number;
}

function EvidenceMeter({ supported, total }: EvidenceMeterProps) {
  const complete = supported === total;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="type-label">Evidence</span>
        <span
          className={cn(
            'text-xs font-semibold tabular-nums',
            complete ? 'text-success' : 'text-foreground',
          )}
        >
          {supported} / {total}
        </span>
      </div>
      <div
        role="img"
        aria-label={`${supported} of ${total} requirements supported by evidence`}
        className="flex h-1.5 gap-0.5 overflow-hidden"
      >
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={cn(
              'h-full flex-1 transition-colors duration-150 ease-standard motion-reduce:transition-none',
              index < supported ? (complete ? 'bg-success' : 'bg-primary') : 'bg-border',
            )}
          />
        ))}
      </div>
    </div>
  );
}

interface ApplicationObjectProps {
  summary: ApplicationSummary;
  selected: boolean;
  now: number;
  onOpen: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  registerRef: (node: HTMLButtonElement | null) => void;
}

export function ApplicationObject({
  summary,
  selected,
  now,
  onOpen,
  onKeyDown,
  registerRef,
}: ApplicationObjectProps) {
  const { evidence, nextAction } = summary;
  const dueAttention = nextAction.dueState === 'overdue' || nextAction.dueState === 'today';

  return (
    <button
      type="button"
      ref={registerRef}
      data-application-id={summary.id}
      data-selected={selected ? 'true' : undefined}
      aria-label={`${summary.role}${summary.organisation ? ` at ${summary.organisation}` : ''}. ${summary.stageLabel}. Next action: ${nextAction.label}. Open application.`}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      className={cn(
        'group interactive block w-full border-b border-border/70 bg-card px-4 py-4 text-left last:border-b-0 sm:px-5 sm:py-5',
        selected && 'is-selected',
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        {/* 1 · Opportunity, 2 · stage, 3 · next action */}
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h3 className="min-w-0 break-words text-sm font-semibold text-foreground sm:text-[15px]">
              {summary.role}
            </h3>
            <Badge variant={STATUS_BADGE_VARIANT[summary.status] ?? 'soft-neutral'}>
              {summary.stageLabel}
            </Badge>
          </div>

          <p className="type-meta flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-medium text-foreground">
              {summary.organisation ?? 'Organisation not recorded'}
            </span>
            {summary.location && (
              <span className="inline-flex items-center gap-1">
                <span aria-hidden="true">·</span>
                <MapPin className="size-3.5" aria-hidden="true" />
                {summary.location}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <span aria-hidden="true">·</span>
              Applied {formatDay(summary.appliedAt)}
            </span>
          </p>

          <p
            className={cn(
              'flex items-start gap-2 border-l-2 pl-2.5 text-xs leading-5',
              dueAttention ? 'border-l-warning text-foreground' : 'border-l-border text-muted-foreground',
            )}
          >
            <span className="type-label shrink-0 leading-5">Next</span>
            <span className="min-w-0 text-foreground">
              {nextAction.label}
              {nextAction.due && (
                <span className={cn('ml-1.5 inline-flex items-center gap-1', dueAttention ? 'text-warning' : 'text-muted-foreground')}>
                  <CalendarClock className="size-3.5" aria-hidden="true" />
                  {nextAction.dueState === 'overdue'
                    ? `Overdue ${formatDay(nextAction.due)}`
                    : nextAction.dueState === 'today'
                      ? 'Due today'
                      : `Due ${formatDay(nextAction.due)}`}
                </span>
              )}
            </span>
          </p>

          {summary.postingMissing && (
            <p className="type-meta text-warning">Original posting unavailable · saved role details shown</p>
          )}
        </div>

        {/* 4 · Evidence and CV state, 5 · secondary metadata */}
        <div className="w-full shrink-0 space-y-2.5 border-t border-border/60 pt-3 sm:w-52 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          {evidence ? (
            <EvidenceMeter
              supported={evidence.supportedRequirementCount}
              total={evidence.requirementCount}
            />
          ) : (
            <p className="type-meta">No requirements mapped yet</p>
          )}

          {summary.cvTitle && (
            <p className="type-meta flex items-center gap-1.5">
              <FileText className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate text-foreground">{summary.cvTitle}</span>
            </p>
          )}

          <div className="flex items-center justify-between gap-2">
            <span className="type-meta">
              {summary.lastActivityAt ? `Updated ${relativeDay(summary.lastActivityAt, now)}` : 'No updates yet'}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity duration-150 ease-standard group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none sm:opacity-60">
              Open
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
