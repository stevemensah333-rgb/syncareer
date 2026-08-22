import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  CheckCircle2,
  DollarSign,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  MessageSquare,
  ShieldQuestion,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  experienceLevelLabel,
  formatPostedAgo,
  getDeadlineState,
  getIngestionFreshness,
  getOpportunityCta,
  getOrganisation,
  getProvenanceFacts,
  getWorkModeLabel,
  PROVENANCE_NOTE,
  type MatchedOpportunityJob,
} from '@/features/opportunities/opportunity';
import { statusLabel, type ApplicationRef } from '@/features/application-tracker/workflow';
import { CompanyLogo } from './CompanyLogo';
import { DeadlinePill } from './DeadlinePill';
import { ContextualAssistantDrawer } from '@/components/assistant/ContextualAssistantDrawer';
import { RequirementEvidenceActions } from '@/components/learning/RequirementEvidenceActions';
import { buildEvidenceHref } from '@/features/learning/requirementLearning';
import { buildOpportunityContext } from '@/features/cv-builder/guidance';

interface OpportunityDetailProps {
  job: MatchedOpportunityJob;
  saved: boolean;
  /** Tracked application for this job, when one exists. */
  application: ApplicationRef | null;
  savingBookmark: boolean;
  tracking: boolean;
  onToggleSave: () => void;
  /** Create the tracker row (native apply, or "mark as applied" for external). */
  onTrack: () => void;
  onBack?: () => void;
}

function formatSalary(min: number | null, max: number | null, currency: string | null): string | null {
  if (!min && !max) return null;
  const c = currency || 'USD';
  if (min && max) return `${c} ${min.toLocaleString()} – ${max.toLocaleString()}`;
  return min ? `${c} ${min.toLocaleString()}+` : `Up to ${c} ${max?.toLocaleString()}`;
}

function FactRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

/**
 * Complete opportunity detail. Everything surfaced by the hover preview is
 * present here together with the description, requirements, provenance, and
 * the opportunity → application actions.
 *
 * Honesty rules enforced here:
 * - no salary line is shown unless salary data exists (no "Competitive");
 * - provenance explicitly says the listing is not independently verified;
 * - an expired deadline is shown as passed, not hidden.
 */
export function OpportunityDetail({
  job,
  saved,
  application,
  savingBookmark,
  tracking,
  onToggleSave,
  onTrack,
  onBack,
}: OpportunityDetailProps) {
  const organisation = getOrganisation(job);
  const deadline = getDeadlineState(job.application_deadline);
  const level = experienceLevelLabel(job.experience_level);
  const workMode = getWorkModeLabel(job);
  const provenance = getProvenanceFacts(job);
  const posted = formatPostedAgo(job.created_at);
  const freshness = getIngestionFreshness(job.updated_at);
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency);
  const assistantOpportunity = buildOpportunityContext(job);
  const cta = getOpportunityCta({
    isExternal: job.is_external,
    hasSourceUrl: Boolean(job.source_url),
    tracked: application !== null,
  });

  const interviewHref = `/interview-simulator?role=${encodeURIComponent(job.title)}&skills=${encodeURIComponent((job.skills ?? []).join(','))}`;
  const cvHref = `/cv-builder?opportunity=${encodeURIComponent(job.id)}&targetRole=${encodeURIComponent(job.title)}${
    organisation ? `&company=${encodeURIComponent(organisation)}` : ''
  }&skills=${encodeURIComponent((job.skills ?? []).join(','))}`;
  const opportunityReturnTo = `/opportunities?job=${encodeURIComponent(job.id)}`;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {onBack ? (
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 gap-1.5 lg:hidden">
          <ArrowLeft className="h-4 w-4" />
          Back to opportunities
        </Button>
      ) : null}
      {/* Header: role, organisation, key facts */}
      <div className="flex items-start gap-4">
        <CompanyLogo job={job} size={56} />
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold leading-tight">{job.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {organisation ?? 'Organisation not specified'}
            {posted ? ` · Added to Syncareer ${posted}` : ''}
          </p>
          <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {job.location}
              {workMode ? ` · ${workMode}` : ''}
            </span>
            <span className="flex items-center gap-1 capitalize">
              <Briefcase className="h-4 w-4" />
              {job.employment_type}
            </span>
            {salary && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                {salary}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <DeadlinePill state={deadline} variant="detail" />
            {deadline.kind === 'none' && (
              <span className="text-xs text-muted-foreground">
                No deadline listed — confirm the closing date on the original posting.
              </span>
            )}
            {application && (
              <Badge variant="secondary" className="text-xs">
                In tracker · {statusLabel(application.status)}
              </Badge>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSave}
          disabled={savingBookmark}
          aria-label={saved ? 'Remove from saved opportunities' : 'Save this opportunity'}
          aria-pressed={saved}
        >
          {savingBookmark ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : saved ? (
            <BookmarkCheck className="h-5 w-5 text-primary" />
          ) : (
            <Bookmark className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Expired deadline honesty banner */}
      {deadline.kind === 'passed' && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-muted-foreground">
          The deadline listed on this posting has passed. The application may no longer be open —
          check the original posting before spending time on an application.
        </div>
      )}
      {freshness.kind === 'stale' && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-muted-foreground">
          {freshness.label}. Confirm that the role is still open on the original source.
        </div>
      )}

      {/* Primary actions */}
      {cta === 'open-tracker' && application ? (
        <Button className="w-full gap-2" asChild>
          <Link to={`/applications?application=${encodeURIComponent(application.id)}`}>
            <Briefcase className="h-4 w-4" />
            Open in tracker · {statusLabel(application.status)}
          </Link>
        </Button>
      ) : cta === 'apply-external' ? (
        <div className="space-y-2">
          <Button className="w-full gap-2" asChild>
            <a href={job.source_url ?? undefined} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Apply on {provenance.sourceLabel}
            </a>
          </Button>
          <Button variant="outline" className="w-full gap-2" onClick={onTrack} disabled={tracking}>
            {tracking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {tracking ? 'Starting tracking…' : 'I applied — start tracking'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Applications for this listing are handled on {provenance.sourceLabel}. After you apply
            there, mark it here so your tracker stays accurate.
          </p>
        </div>
      ) : cta === 'source-unavailable' ? (
        <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          The original source link is unavailable, so Syncareer cannot send you to the application page. Try finding the role directly on {provenance.sourceLabel}.
        </div>
      ) : (
        <Button className="w-full gap-2" onClick={onTrack} disabled={tracking}>
          {tracking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Briefcase className="h-4 w-4" />}
          {tracking ? 'Submitting…' : 'Apply with Syncareer'}
        </Button>
      )}

      {/* Connected practice + CV entry points */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Button variant="outline" className="gap-2" asChild>
          <Link to={interviewHref}>
            <MessageSquare className="h-4 w-4" />
            Practice interview
          </Link>
        </Button>
        <Button variant="outline" className="gap-2" asChild>
          <Link to={cvHref}>
            <FileText className="h-4 w-4" />
            Tailor my CV
          </Link>
        </Button>
      </div>
      <div className="flex justify-end">
        <ContextualAssistantDrawer
          task="opportunity.explain_requirement"
          description="Explain a listed requirement or suggest questions to research. Syncareer receives only the opportunity context shown below."
          suggestedPrompt="Explain the most important requirement in plain language and suggest two questions I should research before applying."
          context={[
            { id: 'role', label: job.title, provenance: 'opportunity', content: [job.title, organisation, job.location, job.employment_type].filter(Boolean).join(' · ') },
            { id: 'description', label: 'Extracted requirements', provenance: 'job_description', content: assistantOpportunity.requirements.map((requirement) => `[${requirement.requirementId}] ${requirement.kind}: ${requirement.sourceText}`).join('\n') },
          ]}
        />
      </div>

      {/* Eligibility facts — no inferred match score */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="font-semibold text-sm">Role facts</p>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FactRow label="Level" value={level ?? 'Not provided'} />
            <FactRow label="Type" value={job.employment_type || 'Not provided'} />
          </dl>
          {job.skills && job.skills.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Skills listed by the source</p>
              <div className="space-y-2">
                {job.skills.map((skill) => <RequirementEvidenceActions
                  key={skill}
                  requirement={skill}
                  role={job.title}
                  evidenceHref={buildEvidenceHref({ requirement: skill, role: job.title, company: organisation ?? undefined, returnTo: opportunityReturnTo })}
                />)}
              </div>
            </div>
          ) : <p className="text-sm text-muted-foreground">No skills were provided by the source.</p>}
        </CardContent>
      </Card>

      {/* Provenance — never claims verification */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <p className="font-semibold text-sm flex items-center gap-1.5">
            <ShieldQuestion className="h-4 w-4 text-muted-foreground" />
            Source details
          </p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <FactRow label="Source" value={provenance.sourceLabel} />
            <FactRow
              label="Original posting"
              value={
                provenance.sourceUrl ? (
                  <a
                    href={provenance.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-2 hover:underline inline-flex items-center gap-1"
                  >
                    Open link
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  'Not available'
                )
              }
            />
            <FactRow label="Published by source" value="Not provided" />
            <FactRow label="Added to Syncareer" value={posted ?? 'Unknown'} />
            <FactRow label="Ingestion freshness" value={freshness.label} />
          </dl>
          <p className="text-xs text-muted-foreground leading-relaxed">{PROVENANCE_NOTE}</p>
        </CardContent>
      </Card>

      {/* Description & requirements */}
      <div>
        <h4 className="font-semibold text-sm mb-2">Description</h4>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.description}</p>
      </div>
      {job.requirements ? (
        <div>
          <h4 className="font-semibold text-sm mb-2">Requirements</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.requirements}</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No requirements were listed for this posting.</p>
      )}
    </div>
  );
}
