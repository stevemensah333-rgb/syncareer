import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ExternalLink,
  FileText,
  Loader2,
  MessageSquare,
  Trash2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { formatShortDate, getDaysAgo, STATUS_COLORS } from '@/features/application-tracker/constants';
import {
  APPLICATION_NOTES_MAX,
  buildJourney,
  canRecordStatus,
  getApplicationNextAction,
  normalizeApplicationNotes,
  statusLabel,
  STATUS_EDITOR_GROUPS,
} from '@/features/application-tracker/workflow';
import {
  getDeadlineState,
  getOrganisation,
  getProvenanceFacts,
  PROVENANCE_NOTE,
} from '@/features/opportunities/opportunity';
import { DeadlinePill } from '@/components/opportunities/DeadlinePill';
import { cn } from '@/lib/utils';

/** Joined posting subset selected by the tracker page. */
export interface TrackedJobSummary {
  title: string | null;
  location: string | null;
  employment_type: string | null;
  company_name: string | null;
  department: string | null;
  source: string | null;
  source_url: string | null;
  application_deadline: string | null;
  skills: string[] | null;
  experience_level: string | null;
  updated_at?: string | null;
}

export interface TrackedApplication {
  id: string;
  job_id: string | null;
  status: string;
  notes: string | null;
  resume_url: string | null;
  created_at: string;
  updated_at: string;
  job: TrackedJobSummary | null;
}

export interface CvSummary {
  id: string;
  title: string | null;
  updated_at: string | null;
}

interface ApplicationDetailSheetProps {
  application: TrackedApplication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The user's primary CV (per the `user_id + is_primary` convention). */
  primaryCv: CvSummary | null;
  /** True when the CV lookup failed — shown as a partial-data note. */
  cvLoadFailed: boolean;
  savingStatus: boolean;
  savingNotes: boolean;
  deleting: boolean;
  onRecordStatus: (status: string) => void;
  onSaveNotes: (notes: string) => void;
  onDelete: () => void;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</h3>;
}

/**
 * Full detail view for a tracked application. Preserves list context by
 * opening as a side sheet: status journey, next recommended action,
 * deadline, targeted CV, interview practice, notes, outcome recording, and
 * removal (with confirmation).
 */
export function ApplicationDetailSheet({
  application,
  open,
  onOpenChange,
  primaryCv,
  cvLoadFailed,
  savingStatus,
  savingNotes,
  deleting,
  onRecordStatus,
  onSaveNotes,
  onDelete,
}: ApplicationDetailSheetProps) {
  const [notesDraft, setNotesDraft] = useState('');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Reset local editor state whenever a different application is opened or
  // notes change upstream (e.g. after a successful save).
  const applicationId = application?.id ?? null;
  const storedNotes = application?.notes ?? '';
  useEffect(() => {
    setNotesDraft(storedNotes);
    setConfirmDeleteOpen(false);
  }, [applicationId, storedNotes]);

  const journey = useMemo(
    () => (application ? buildJourney(application.status) : null),
    [application],
  );

  if (!application || !journey) {
    // Keep the sheet mounted (smooth close animation) but render nothing.
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0" aria-hidden />
      </Sheet>
    );
  }

  const job = application.job;
  const role = job?.title?.trim() || 'Tracked application';
  const organisation = job ? getOrganisation(job) : null;
  const deadline = getDeadlineState(job?.application_deadline);
  const provenance = getProvenanceFacts(job ?? {});
  const nextAction = getApplicationNextAction({
    status: application.status,
    jobTitle: job?.title ?? null,
    jobMissing: job === null,
    deadlinePassed: deadline.kind === 'passed',
    hasCv: primaryCv !== null ? true : cvLoadFailed ? null : false,
    skills: job?.skills,
  });

  const notesDirty = (normalizeApplicationNotes(notesDraft) ?? '') !== (application.notes ?? '');

  const interviewHref = `/interview-simulator?role=${encodeURIComponent(role)}&skills=${encodeURIComponent(
    (job?.skills ?? []).join(','),
  )}`;
  const cvHref = `/cv-builder?targetRole=${encodeURIComponent(role)}${
    organisation ? `&company=${encodeURIComponent(organisation)}` : ''
  }&skills=${encodeURIComponent((job?.skills ?? []).join(','))}&application=${encodeURIComponent(application.id)}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b space-y-2 text-left">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="min-w-0 space-y-1">
              <SheetTitle className="text-lg leading-tight">{role}</SheetTitle>
              <SheetDescription asChild>
                <div className="text-sm text-muted-foreground">
                  {organisation ?? (job ? 'Organisation not specified' : 'Posting unavailable')}
                  {job?.location ? ` · ${job.location}` : ''}
                  {job?.employment_type ? <span className="capitalize"> · {job.employment_type}</span> : ''}
                </div>
              </SheetDescription>
            </div>
            <span
              className={cn(
                'shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium',
                STATUS_COLORS[application.status] ?? 'bg-muted text-muted-foreground',
              )}
            >
              {statusLabel(application.status)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Applied {formatShortDate(application.created_at)} · Last update {getDaysAgo(application.updated_at).toLowerCase()}
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {job === null && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-muted-foreground flex gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-warning" />
              The original posting is no longer available, so role details and the deadline cannot
              be shown. Your record, status, and notes are preserved.
            </div>
          )}

          {journey.unknownStatus && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-muted-foreground flex gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-warning" />
              This record has a status (“{application.status}”) that is not part of the standard
              journey. Choose a standard status below to restore the journey view.
            </div>
          )}

          {/* Deadline */}
          {deadline.kind !== 'none' && (
            <div className="space-y-1.5">
              <SectionTitle>Deadline</SectionTitle>
              <DeadlinePill state={deadline} variant="detail" />
              {deadline.kind === 'passed' && (
                <p className="text-xs text-muted-foreground">
                  The listed deadline has passed — confirm on the original posting whether
                  applications are still open.
                </p>
              )}
            </div>
          )}

          {/* Journey */}
          <div className="space-y-2">
            <SectionTitle>Where you are</SectionTitle>
            <ol className="flex items-start gap-1" aria-label="Application journey">
              {journey.steps.map((step, idx) => (
                <li key={step.stage} className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full shrink-0',
                        step.state === 'done' && 'bg-primary',
                        step.state === 'current' &&
                          (journey.terminal === 'hired'
                            ? 'bg-success ring-4 ring-success/15'
                            : journey.terminal
                              ? 'bg-destructive ring-4 ring-destructive/15'
                              : 'bg-primary ring-4 ring-primary/15'),
                        step.state === 'upcoming' && 'bg-muted-foreground/30',
                        step.state === 'unrecorded' && 'bg-transparent border border-dashed border-muted-foreground/40',
                      )}
                      aria-hidden
                    />
                    {idx < journey.steps.length - 1 && (
                      <span
                        className={cn(
                          'h-px flex-1',
                          step.state === 'done' ? 'bg-primary' : 'bg-border',
                        )}
                        aria-hidden
                      />
                    )}
                  </div>
                  <p
                    className={cn(
                      'mt-1.5 text-[11px] leading-tight',
                      step.state === 'current' ? 'font-semibold text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {step.label}
                    {step.state === 'current' && <span className="sr-only">(current stage)</span>}
                  </p>
                </li>
              ))}
            </ol>
            {journey.terminal === null && !journey.unknownStatus && (
              <p className="text-xs text-muted-foreground">
                Earlier stages are highlighted based on the status you recorded.
              </p>
            )}
          </div>

          {/* Next recommended action */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                Recommended next step
              </p>
              <p className="text-sm font-medium">{nextAction.title}</p>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{nextAction.description}</p>
              {nextAction.kind === 'link' && nextAction.href && nextAction.ctaLabel && (
                <Button size="sm" className="mt-1.5 gap-1.5" asChild>
                  <Link to={nextAction.href}>
                    {nextAction.ctaLabel}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
              {nextAction.kind === 'record-outcome' && (
                <p className="text-xs text-muted-foreground">Use “Record outcome” below.</p>
              )}
            </CardContent>
          </Card>

          {/* Targeted CV */}
          <div className="space-y-2">
            <SectionTitle>Targeted CV</SectionTitle>
            <Card>
              <CardContent className="p-4 space-y-2.5">
                {cvLoadFailed ? (
                  <p className="text-sm text-muted-foreground">
                    Your CV could not be loaded right now. The rest of this page still works — try
                    again later.
                  </p>
                ) : primaryCv ? (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate">{primaryCv.title || 'My CV'}</span>
                      <Badge variant="secondary" className="text-[10px]">Primary CV</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This is your primary CV
                      {primaryCv.updated_at
                        ? ` · last updated ${formatShortDate(primaryCv.updated_at)}`
                        : ''}
                      . The current application schema does not link a specific saved CV version, so confirm which version you submitted.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    You have not saved a CV yet. Create one so you can tailor it to this role.
                  </p>
                )}
                {application.resume_url && (
                  <p className="text-xs text-muted-foreground">
                    <a
                      href={application.resume_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline-offset-2 hover:underline inline-flex items-center gap-1"
                    >
                      Attached CV link
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                )}
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <Link to={cvHref}>
                    <FileText className="h-3.5 w-3.5" />
                    {primaryCv ? 'Tailor CV for this role' : 'Create my CV'}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Interview practice entry point */}
          <div className="space-y-2">
            <SectionTitle>Interview practice</SectionTitle>
            <Button variant="outline" className="w-full gap-2" asChild>
              <Link to={interviewHref}>
                <MessageSquare className="h-4 w-4" />
                Practice an interview for this role
              </Link>
            </Button>
          </div>

          {/* Notes (job_applications.notes) */}
          <div className="space-y-2">
            <SectionTitle>Your notes</SectionTitle>
            <Textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value.slice(0, APPLICATION_NOTES_MAX))}
              placeholder="Follow-up dates, contacts, things to remember…"
              rows={4}
              aria-label="Application notes"
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">
                {notesDraft.length}/{APPLICATION_NOTES_MAX}
              </p>
              <Button
                size="sm"
                variant="secondary"
                className="gap-1.5"
                disabled={!notesDirty || savingNotes}
                onClick={() => onSaveNotes(notesDraft)}
              >
                {savingNotes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                {savingNotes ? 'Saving…' : 'Save notes'}
              </Button>
            </div>
          </div>

          {/* Status / outcome recording */}
          <div className="space-y-2">
            <SectionTitle>Update status</SectionTitle>
            <Select
              value={application.status}
              onValueChange={(value) => {
                if (canRecordStatus(application.status, value)) onRecordStatus(value);
              }}
              disabled={savingStatus}
            >
              <SelectTrigger aria-label="Application status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_EDITOR_GROUPS.map((group) => (
                  <SelectGroup key={group.id}>
                    <SelectLabel>{group.label}</SelectLabel>
                    {group.options.map((option) => (
                      <SelectItem key={option.value} value={option.value} disabled={option.value === application.status}>
                        <span className="flex flex-col items-start gap-0.5">
                          <span>{option.label}</span>
                          <span className="text-[11px] text-muted-foreground">{option.description}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            {savingStatus && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving status…
              </p>
            )}
          </div>

          {/* Provenance of the underlying posting */}
          {job && (
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <SectionTitle>Listing source</SectionTitle>
              <p>
                Listed via {provenance.sourceLabel}
                {provenance.sourceUrl && (
                  <>
                    {' · '}
                    <a
                      href={provenance.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline-offset-2 hover:underline inline-flex items-center gap-1"
                    >
                      View original posting
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </>
                )}
              </p>
              <p className="leading-relaxed">{PROVENANCE_NOTE}</p>
            </div>
          )}
        </div>

        {/* Danger zone */}
        <div className="border-t p-4 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Removing deletes this record from your tracker.
          </p>
          <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive gap-1.5" disabled={deleting}>
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Remove
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove this application?</AlertDialogTitle>
                <AlertDialogDescription>
                  “{role}” and its notes will be removed from your tracker. This cannot be undone.
                  If you only want to end the application, record “Withdrawn” instead.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep application</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => onDelete()}
                >
                  Remove application
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SheetContent>
    </Sheet>
  );
}
