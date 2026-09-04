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
  MapPin,
  MessageSquare,
  ShieldQuestion,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

import { Button } from '@/components/ui/button';
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
import type { FitExplanation } from '@/features/opportunities/fit';
import { statusLabel, type ApplicationRef } from '@/features/application-tracker/workflow';
import { CompanyLogo } from './CompanyLogo';
import { DeadlinePill } from './DeadlinePill';
import { ContextualAssistantDrawer } from '@/components/assistant/ContextualAssistantDrawer';
import { RequirementEvidenceActions } from '@/components/learning/RequirementEvidenceActions';
import { buildEvidenceHref } from '@/features/learning/requirementLearning';
import { buildOpportunityContext } from '@/features/cv-builder/guidance';
import { RecordState } from '@/components/dossier';

interface OpportunityDetailProps {
  job: MatchedOpportunityJob;
  /** Real-evidence fit explanation, when one exists for this profile. */
  fit: FitExplanation | null;
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
    <div className="space-y-0.5 border-l-2 border-border pl-3">
      <dt className="type-label">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

function DetailSection({
  title,
  children,
  id,
}: {
  title: string;
  children: React.ReactNode;
  id: string;
}) {
  return (
    <section className="border-t border-border pt-5" aria-labelledby={id}>
      <h3 id={id} className="type-section-title">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * Complete opportunity detail as a Discover-mode object.
 *
 * Explicitly NOT a document/dossier: operational typography, spaced sections,
 * and the same fit explanation shown on the card. Honesty rules held here:
 * - no salary line without salary data (no "Competitive");
 * - provenance explicitly says the listing is not independently verified;
 * - an expired deadline is shown as passed, not hidden.
 */
export function OpportunityDetail({
  job,
  fit,
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
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden p-4 sm:p-6">
      {onBack ? (
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 gap-1.5 lg:hidden">
          <ArrowLeft className="h-4 w-4" />
          Back to opportunities
        </Button>
      ) : null}

      {/* Header: role, organisation, key facts */}
      <header className="flex items-start gap-4">
        <CompanyLogo job={job} size={56} />
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold leading-7 tracking-[-0.015em] text-foreground sm:text-2xl sm:leading-8">
            {job.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {organisation ?? 'Organisation not specified'}
            {posted ? ` · Added to Syncareer ${posted}` : ''}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin aria-hidden="true" className="size-4 shrink-0" />
              <span className="truncate">{job.location}</span>
              {workMode ? ` · ${workMode}` : ''}
            </span>
            <span className="capitalize">
              <Briefcase aria-hidden="true" className="mr-1 inline size-4" />
              {job.employment_type}
            </span>
            {salary && (
              <span>
                <DollarSign aria-hidden="true" className="mr-1 inline size-4" />
                {salary}
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <DeadlinePill state={deadline} variant="detail" />
            {deadline.kind === 'none' && (
              <span className="text-xs text-muted-foreground">
                No deadline listed — confirm the closing date on the original posting.
              </span>
            )}
            {application && (
              <span className="rounded-control border border-border bg-secondary px-2 py-1 text-[11px] font-medium text-foreground-secondary">
                Tracking · {statusLabel(application.status)}
              </span>
            )}
            {level && <span className="text-xs text-muted-foreground">{level}</span>}
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
            <Spinner className="size-5" />
          ) : saved ? (
            <BookmarkCheck aria-hidden="true" className="size-5 text-primary" />
          ) : (
            <Bookmark aria-hidden="true" className="size-5" />
          )}
        </Button>
      </header>

      {/* Expired / stale honesty banners */}
      {deadline.kind === 'passed' && (
        <RecordState tone="error" title="The listed deadline has passed" description="The application may no longer be open. Check the original posting before spending time on an application." />
      )}
      {freshness.kind === 'stale' && (
        <RecordState tone="warning" title="This source record may be stale" description={`${freshness.label}. Confirm that the role is still open on the original source.`} />
      )}

      {/* Fit — evidence-based explanation, never a decorated score */}
      {fit && (
        <div className="rounded-surface-lg border border-accent/70 bg-accent p-4">
          <p className="text-sm font-semibold text-accent-foreground">{fit.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">because</p>
          <ul className="mt-1.5 space-y-1">
            {fit.reasons.map((reason) => (
              <li key={reason.source} className="text-sm text-foreground">
                {reason.text}
              </li>
            ))}
          </ul>
          {fit.gaps.length > 0 && (
            <div className="mt-3 border-t border-accent/60 pt-2.5">
              <p className="text-xs font-medium text-foreground-secondary">Check before applying</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {fit.gaps.map((gap) => gap.skill).join(', ')} — listed by the source but not in
                your recorded skills. Confirm with the listing before you invest time.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Primary action */}
      {cta === 'open-tracker' && application ? (
        <Button className="w-full gap-2" asChild>
          <Link to={`/applications?application=${encodeURIComponent(application.id)}`}>
            <Briefcase aria-hidden="true" className="size-4" />
            Open in tracker · {statusLabel(application.status)}
          </Link>
        </Button>
      ) : cta === 'apply-external' ? (
        <div className="space-y-2">
          <Button className="w-full gap-2" asChild>
            <a href={job.source_url ?? undefined} target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden="true" className="size-4" />
              Apply on {provenance.sourceLabel}
            </a>
          </Button>
          <Button variant="outline" className="w-full gap-2" onClick={onTrack} disabled={tracking}>
            {tracking ? (
              <Spinner className="size-4" />
            ) : (
              <CheckCircle2 aria-hidden="true" className="size-4" />
            )}
            {tracking ? 'Starting tracking…' : 'I applied — start tracking'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Applications for this listing are handled on {provenance.sourceLabel}. After you apply
            there, mark it here so your tracker stays accurate.
          </p>
        </div>
      ) : cta === 'source-unavailable' ? (
        <RecordState tone="warning" title="Original source unavailable" description={`Syncareer cannot send you to the application page. Try finding the role directly on ${provenance.sourceLabel}.`} />
      ) : (
        <Button className="w-full gap-2" onClick={onTrack} disabled={tracking}>
          {tracking ? (
            <Spinner className="size-4" />
          ) : (
            <Briefcase aria-hidden="true" className="size-4" />
          )}
          {tracking ? 'Submitting…' : 'Apply with Syncareer'}
        </Button>
      )}

      {/* Connected practice + CV entry points */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button variant="outline" className="gap-2" asChild>
          <Link to={interviewHref}>
            <MessageSquare aria-hidden="true" className="size-4" />
            Practice interview
          </Link>
        </Button>
        <Button variant="outline" className="gap-2" asChild>
          <Link to={cvHref}>
            <FileText aria-hidden="true" className="size-4" />
            Review primary CV
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

      {/* Role facts */}
      <DetailSection title="Role facts" id="role-facts-title">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FactRow label="Level" value={level ?? 'Not provided'} />
          <FactRow label="Type" value={job.employment_type || 'Not provided'} />
        </dl>
        {job.skills && job.skills.length > 0 ? (
          <div className="mt-4">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              Skills listed by the source
            </p>
            <div className="space-y-2">
              {job.skills.map((skill) => (
                <RequirementEvidenceActions
                  key={skill}
                  requirement={skill}
                  role={job.title}
                  evidenceHref={buildEvidenceHref({ requirement: skill, role: job.title, company: organisation ?? undefined, returnTo: opportunityReturnTo })}
                />
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No skills were provided by the source.</p>
        )}
      </DetailSection>

      {/* About the role */}
      <DetailSection title="About the role" id="opportunity-description-title">
        <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{job.description}</p>
      </DetailSection>
      {job.requirements && (
        <DetailSection title="Requirements" id="opportunity-requirements-title">
          <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{job.requirements}</p>
        </DetailSection>
      )}

      {/* Provenance — never claims verification */}
      <DetailSection title="About this listing" id="source-details-title">
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
                  className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                >
                  Open link
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                </a>
              ) : (
                'Not available'
              )
            }
          />
          <FactRow label="Added to Syncareer" value={posted ?? 'Unknown'} />
          <FactRow label="Ingestion freshness" value={freshness.label} />
        </dl>
        <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
          <ShieldQuestion aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          {PROVENANCE_NOTE}
        </p>
      </DetailSection>
    </div>
  );
}
