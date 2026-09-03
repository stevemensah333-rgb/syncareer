import { ArrowRight, BriefcaseBusiness, FileText, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  ApplicationStageRail,
  DossierHeader,
  DossierSection,
  RecordState,
  WorkingDocument,
  type DossierStage,
} from '@/components/dossier';
import { Button } from '@/components/ui/button';
import { formatShortDate, getDaysAgo } from '@/features/application-tracker/constants';
import { buildJourney, statusLabel } from '@/features/application-tracker/workflow';
import { getDaysUntilDeadline, getDeadlineLabel, nextStepForApplicationStatus } from './utils';

export interface PrimaryJob {
  id: string;
  title: string;
  company_name?: string | null;
  location?: string | null;
  employment_type?: string | null;
  application_deadline?: string | null;
}

export interface PrimaryApplication {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  next_action?: string | null;
  next_action_due?: string | null;
  resume_id?: string | null;
  job_title_snapshot?: string | null;
  company_name_snapshot?: string | null;
  job: PrimaryJob | null;
}

export interface PrimarySaved {
  job_id: string;
  created_at: string;
  job: PrimaryJob | null;
}

type Props =
  | { type: 'application'; data: PrimaryApplication; cvStarted?: boolean }
  | { type: 'saved'; data: PrimarySaved; cvStarted?: boolean }
  | { type: 'none' };

function StatusLabel({ children, tone = 'neutral' }: { children: string; tone?: 'neutral' | 'attention' }) {
  return (
    <span
      className={
        tone === 'attention'
          ? 'inline-flex min-h-7 items-center border border-warning bg-[hsl(var(--dossier-clay-wash))] px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-warning'
          : 'inline-flex min-h-7 items-center border border-border bg-muted/50 px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground'
      }
    >
      {children}
    </span>
  );
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: 'warning' | 'success' }) {
  return (
    <div
      className={`border-l-2 px-3 py-2 ${
        tone === 'warning'
          ? 'border-l-warning bg-[hsl(var(--dossier-clay-wash))]'
          : tone === 'success'
            ? 'border-l-success bg-[hsl(var(--dossier-jade-wash))]'
            : 'border-l-border bg-muted/30'
      }`}
    >
      <p className="type-label">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

export function PrimaryFocusCard(props: Props) {
  const navigate = useNavigate();

  if (props.type === 'none') return null;

  if (props.type === 'saved') {
    const job = props.data.job;
    if (!job) return null;
    const deadlineInfo = getDeadlineLabel(getDaysUntilDeadline(job.application_deadline ?? null));

    return (
      <WorkingDocument label="Current opportunity decision">
        <DossierHeader
          titleAs="h2"
          eyebrow="Saved opportunity / Decision needed"
          title={job.title}
          description="Review the opportunity, tailor your evidence, and decide whether to start an application dossier."
          metadata={
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {job.company_name && <span className="inline-flex items-center gap-1.5"><BriefcaseBusiness className="h-3.5 w-3.5" />{job.company_name}</span>}
              {job.location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{job.location}</span>}
              {job.employment_type && <span className="capitalize">{job.employment_type}</span>}
              <span>Saved {formatShortDate(props.data.created_at)}</span>
            </div>
          }
          status={<StatusLabel>Saved</StatusLabel>}
          actions={
            <Button onClick={() => navigate(`/opportunities?job=${encodeURIComponent(props.data.job_id)}`)} className="gap-1.5">
              Review opportunity <ArrowRight className="h-4 w-4" />
            </Button>
          }
        />
        <DossierSection index="01" label="Decision" title="Prepare before you apply">
          <div className="grid gap-3 sm:grid-cols-3">
            <Fact label="Record state" value="Saved for review" />
            <Fact
              label="Deadline"
              value={deadlineInfo?.label ?? 'No deadline recorded'}
              tone={deadlineInfo?.tone === 'urgent' || deadlineInfo?.tone === 'soon' ? 'warning' : undefined}
            />
            <Fact label="Base CV" value={props.cvStarted ? 'Available to tailor' : 'Not started'} tone={props.cvStarted ? 'success' : undefined} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate(`/cv-builder?targetRole=${encodeURIComponent(job.title)}`)}>
              <FileText className="mr-1.5 h-4 w-4" /> Tailor CV
            </Button>
          </div>
        </DossierSection>
      </WorkingDocument>
    );
  }

  const app = props.data;
  const job = app.job;
  const role = job?.title ?? app.job_title_snapshot ?? 'Application';
  const company = job?.company_name ?? app.company_name_snapshot;
  const suggestedNext = nextStepForApplicationStatus(app.status, role);
  const journey = buildJourney(app.status);
  const stages: DossierStage[] = journey.steps.map((step) => ({
    id: step.stage,
    label: step.label,
    state: step.state,
  }));
  const deadlineInfo = getDeadlineLabel(getDaysUntilDeadline(job?.application_deadline ?? null));
  const hasRecordedAction = Boolean(app.next_action?.trim());

  return (
    <WorkingDocument label="Current application dossier">
      <DossierHeader
        titleAs="h2"
        eyebrow="Current application dossier"
        title={role}
        description={company ?? 'Organization not recorded'}
        metadata={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {job?.location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{job.location}</span>}
            {job?.employment_type && <span className="capitalize">{job.employment_type}</span>}
            <span>Applied {formatShortDate(app.created_at)}</span>
            <span>Updated {getDaysAgo(app.updated_at)}</span>
          </div>
        }
        status={<StatusLabel>{statusLabel(app.status)}</StatusLabel>}
        actions={
          <Button onClick={() => navigate(`/applications?application=${encodeURIComponent(app.id)}`)} className="gap-1.5">
            Open dossier <ArrowRight className="h-4 w-4" />
          </Button>
        }
      />

      <ApplicationStageRail stages={stages} />

      {journey.unknownStatus && (
        <div className="border-b border-border p-4 sm:px-6">
          <RecordState
            tone="warning"
            title="This application has an unfamiliar status"
            description="The stored status is shown as recorded. Syncareer has not inferred any missing application stages."
          />
        </div>
      )}

      <DossierSection
        index="01"
        label={hasRecordedAction ? 'Recorded next action' : 'Suggested next action'}
        title={hasRecordedAction ? app.next_action!.trim() : suggestedNext.title}
        description={
          hasRecordedAction
            ? app.next_action_due
              ? `Due ${formatShortDate(app.next_action_due)}`
              : 'No due date recorded.'
            : suggestedNext.description
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Fact label="Application stage" value={statusLabel(app.status)} />
          <Fact
            label="Deadline"
            value={deadlineInfo?.label ?? 'No deadline recorded'}
            tone={deadlineInfo?.tone === 'urgent' || deadlineInfo?.tone === 'soon' ? 'warning' : undefined}
          />
          <Fact
            label="Application CV"
            value={app.resume_id ? 'Linked to this application' : props.cvStarted ? 'Base CV available' : 'Not started'}
            tone={app.resume_id ? 'success' : undefined}
          />
        </div>
        {!hasRecordedAction && (
          <div className="mt-4">
            <Button variant="outline" onClick={() => navigate(suggestedNext.href)}>
              {suggestedNext.ctaLabel}
            </Button>
          </div>
        )}
      </DossierSection>
    </WorkingDocument>
  );
}
