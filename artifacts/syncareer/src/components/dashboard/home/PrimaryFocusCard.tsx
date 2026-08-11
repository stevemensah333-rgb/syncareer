import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, MapPin, Briefcase, Clock, FileText, Bookmark } from 'lucide-react';
import { STATUS_COLORS, formatShortDate, getDaysAgo } from '@/features/application-tracker/constants';
import { statusLabel, ORDERED_STATUSES, nextStepForApplicationStatus, getDaysUntilDeadline, getDeadlineLabel } from './utils';
import { useNavigate } from 'react-router-dom';

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
  job: PrimaryJob | null;
}

export interface PrimarySaved {
  job_id: string;
  created_at: string;
  job: PrimaryJob | null;
}

type Props =
  | { type: 'application'; data: PrimaryApplication }
  | { type: 'saved'; data: PrimarySaved }
  | { type: 'none' };

export function PrimaryFocusCard(props: Props) {
  const navigate = useNavigate();

  if (props.type === 'none') {
    return null;
  }

  if (props.type === 'saved') {
    const job = props.data.job;
    if (!job) return null;
    const days = getDaysUntilDeadline(job.application_deadline ?? null);
    const deadlineInfo = getDeadlineLabel(days);
    return (
      <Card className="border-primary/25 bg-card overflow-hidden">
        <CardContent className="p-6 md:p-7">
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Continue your application</p>
                <h2 className="text-xl md:text-2xl font-semibold tracking-tight leading-tight truncate">
                  {job.title}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
                  {job.company_name && <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{job.company_name}</span>}
                  {job.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>}
                  {job.employment_type && <span className="capitalize">{job.employment_type}</span>}
                </div>
              </div>
              <Badge variant="secondary" className="shrink-0 text-[11px]">
                <Bookmark className="h-3 w-3 mr-1" /> Saved
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Saved {formatShortDate(props.data.created_at)}</span>
              {deadlineInfo && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${deadlineInfo.tone === 'urgent' ? 'bg-destructive/10 text-destructive' : deadlineInfo.tone === 'soon' ? 'bg-warning/15 text-warning' : 'bg-muted text-muted-foreground'}`}>
                  {deadlineInfo.label}
                </span>
              )}
            </div>

            <div className="rounded-lg bg-primary/5 border border-primary/10 p-4 space-y-2">
              <p className="text-sm font-medium text-foreground">Next: apply to this role</p>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                You saved {job.title} {job.company_name ? `at ${job.company_name}` : ''}. Tailor your CV to the posting and submit your application.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => navigate(`/opportunities?job=${encodeURIComponent(props.data.job_id)}`)} className="gap-1.5">
                Continue application <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => navigate(`/cv-builder?targetRole=${encodeURIComponent(job.title)}`)}>
                <FileText className="h-4 w-4 mr-1.5" /> Tailor CV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // application
  const app = props.data;
  const job = app.job;
  const next = nextStepForApplicationStatus(app.status, job?.title ?? '');
  const statusIdx = ORDERED_STATUSES.indexOf(app.status);
  const days = job?.application_deadline ? getDaysUntilDeadline(job.application_deadline) : null;
  const deadlineInfo = getDeadlineLabel(days);

  return (
    <Card className="border-primary/20 bg-card overflow-hidden">
      <CardContent className="p-6 md:p-7">
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Continue your application</p>
              <h2 className="text-xl md:text-[22px] font-semibold tracking-tight leading-tight truncate">
                {job?.title ?? 'Application'}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
                {job?.company_name && <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{job.company_name}</span>}
                {job?.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>}
                {job?.employment_type && <span className="capitalize">{job.employment_type}</span>}
              </div>
            </div>
            <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_COLORS[app.status] ?? 'bg-muted text-muted-foreground'}`}>
              {statusLabel(app.status)}
            </span>
          </div>

          {/* Where am I — linear status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-medium text-muted-foreground">Progress</p>
              <p className="text-[12px] text-muted-foreground">{formatShortDate(app.created_at)} · {getDaysAgo(app.updated_at)}</p>
            </div>
            <ol className="flex items-center gap-1.5" aria-label="Application progress">
              {ORDERED_STATUSES.map((s, idx) => {
                const isDone = statusIdx >= idx && statusIdx !== -1;
                const isCurrent = s === app.status;
                return (
                  <li key={s} className="flex items-center gap-1.5 flex-1">
                    <div className={`h-1.5 flex-1 rounded-full ${isDone ? 'bg-primary' : 'bg-muted'} ${isCurrent ? 'ring-2 ring-primary/20' : ''}`} />
                  </li>
                );
              })}
            </ol>
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Applied</span>
              <span>Offer</span>
            </div>
            {deadlineInfo && (
              <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${deadlineInfo.tone === 'urgent' ? 'bg-destructive/10 text-destructive' : deadlineInfo.tone === 'soon' ? 'bg-warning/15 text-warning' : 'bg-muted text-muted-foreground'}`}>
                {deadlineInfo.label}
              </span>
            )}
          </div>

          {/* What should I do next */}
          <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
            <p className="text-[13px] font-semibold text-foreground">{next.title}</p>
            <p className="text-[13px] leading-relaxed text-muted-foreground">{next.description}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate(`/applications?application=${encodeURIComponent(app.id)}`)} className="gap-1.5">
              Open tracker <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => navigate(next.href)}>
              {next.ctaLabel}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
