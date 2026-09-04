import { useMemo, useState } from 'react';
import { FileText, Link2, Mic2, Plus } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

import { Button } from '@/components/ui/button';
import type { DossierEvidenceData } from '@/features/application-dossier/dossier';
import { buildRequirementThreads } from '@/features/evidence/dossierViewModel';
import { deriveSupportStatus } from '@/features/evidence/supportStatus';
import {
  describeRequirementFlow,
  groupCvLinksByEvidence,
  type RequirementFlow,
} from '@/features/application-dossier/requirementFlow';
import type { EvidenceSourceRow, ResumeEvidenceLinkRow } from '@/features/evidence/types';
import type { RequirementThread } from '@/features/evidence/dossierViewModel';
import type { DossierSectionId } from '@/features/application-dossier/requirementFlow';
import {
  EvidenceInspector,
  EvidenceReference,
  EvidenceStamp,
  RecordState,
  SourceReference,
  type SourceReferenceType,
} from '@/components/dossier';
import { cn } from '@/lib/utils';

export type InspectorSelection = { kind: 'requirement' | 'evidence'; id: string } | null;

interface ApplicationEvidenceInspectorProps {
  data: DossierEvidenceData;
  selection: InspectorSelection;
  /** The application's own CV; used only to name material facts truthfully. */
  applicationCvId: string | null;
  applicationCvTitle: string | null;
  className?: string;
  /**
   * Where the next action actually happens: the inspector names the control and
   * hands focus to it in the centre document. Optional, so the panel can also
   * be rendered read-only.
   */
  onFocusControl?: (section: DossierSectionId, elementId: string) => void;
  onConfirmEvidence?: (evidenceId: string) => Promise<boolean> | boolean;
}

/**
 * Right-zone context for the Application Dossier.
 *
 * It reads only the dossier bundle already loaded by the page and answers the
 * same four questions the centre document asks, for whichever record is
 * selected: what the requirement is, which evidence answers it, where that
 * evidence is already used, and what to do next. Anything the data cannot
 * answer is stated as missing instead of filled in.
 */
export function ApplicationEvidenceInspector({
  data,
  selection,
  applicationCvId,
  applicationCvTitle,
  className,
  onFocusControl,
  onConfirmEvidence,
}: ApplicationEvidenceInspectorProps) {
  const [confirmBusy, setConfirmBusy] = useState(false);

  const threads = useMemo(
    () => buildRequirementThreads(data.requirements, data.links, data.items, data.sources, data.resumeLinks),
    [data.requirements, data.links, data.items, data.sources, data.resumeLinks],
  );

  const sourcesByEvidence = useMemo(() => {
    const map = new Map<string, EvidenceSourceRow[]>();
    for (const source of data.sources) {
      const existing = map.get(source.evidence_id);
      if (existing) existing.push(source);
      else map.set(source.evidence_id, [source]);
    }
    return map;
  }, [data.sources]);

  const cvLinksByEvidence = useMemo(() => groupCvLinksByEvidence(data.resumeLinks), [data.resumeLinks]);

  const selectedRequirement =
    selection?.kind === 'requirement' ? data.requirements.find((item) => item.id === selection.id) ?? null : null;
  const selectedEvidence =
    selection?.kind === 'evidence' ? data.items.find((item) => item.id === selection.id) ?? null : null;

  const selectedThread = selectedRequirement
    ? threads.find((thread) => thread.requirement.id === selectedRequirement.id) ?? null
    : null;
  const flow: RequirementFlow | null = selectedThread
    ? describeRequirementFlow(selectedThread, { cvLinksByEvidence, applicationCvId, applicationCvTitle })
    : null;

  const title = selectedRequirement
    ? selectedRequirement.label
    : selectedEvidence
      ? selectedEvidence.title
      : 'Evidence context';
  let description = 'Select a requirement or evidence record to inspect it.';
  if (selectedRequirement) {
    description =
      selectedRequirement.detail ??
      (selectedRequirement.origin === 'posting_skill' ? 'From the job listing' : 'Recorded requirement');
  } else if (selectedEvidence) {
    description = selectedEvidence.summary || 'Evidence record';
  }

  const body = selectedRequirement ? (
    flow && selectedThread ? (
      <RequirementBands thread={selectedThread} flow={flow} onFocusControl={onFocusControl} />
    ) : (
      <RecordState
        tone="warning"
        title="Requirement unavailable"
        description="This requirement is no longer part of the application."
      />
    )
  ) : selectedEvidence ? (
    <EvidenceBands
      data={data}
      evidenceId={selectedEvidence.id}
      sourcesByEvidence={sourcesByEvidence}
      cvLinksByEvidence={cvLinksByEvidence}
      applicationCvId={applicationCvId}
      applicationCvTitle={applicationCvTitle}
      confirmBusy={confirmBusy}
      onFocusControl={onFocusControl}
      onConfirmEvidence={
        onConfirmEvidence
          ? async (evidenceId: string) => {
              setConfirmBusy(true);
              try {
                await onConfirmEvidence(evidenceId);
              } finally {
                setConfirmBusy(false);
              }
            }
          : undefined
      }
    />
  ) : (
    <EmptyInspector hasRequirements={data.requirements.length > 0} onFocusControl={onFocusControl} />
  );

  const selectionKey = selection ? `${selection.kind}:${selection.id}` : 'none';

  return (
    <EvidenceInspector
      eyebrow={selectedRequirement ? 'Requirement' : 'Evidence'}
      title={title}
      description={description}
      className={cn('shadow-card', className)}
    >
      {/* Keyed on the selection so the panel visibly re-enters when the
          context changes — the motion explains the relationship. */}
      <div key={selectionKey} className="dossier-inspector-enter space-y-4">
        {body}
      </div>
    </EvidenceInspector>
  );
}

function EmptyInspector({
  hasRequirements,
  onFocusControl,
}: {
  hasRequirements: boolean;
  onFocusControl?: (section: DossierSectionId, elementId: string) => void;
}) {
  return (
    <>
      <p className="text-sm leading-6 text-muted-foreground">
        Pick a requirement or a piece of evidence in the application to see its supporting context here.
      </p>
      {!hasRequirements && onFocusControl && (
        <Band label="Next action" detail="No requirements recorded yet.">
          <Button type="button" size="sm" onClick={() => onFocusControl('requirements', 'dossier-add-requirement')}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add a requirement
          </Button>
        </Band>
      )}
    </>
  );
}

function RequirementBands({
  thread,
  flow,
  onFocusControl,
}: {
  thread: RequirementThread;
  flow: RequirementFlow;
  onFocusControl?: (section: DossierSectionId, elementId: string) => void;
}) {
  const strength =
    flow.status === 'no_evidence' ? (
      <RecordState
        tone="warning"
        title="No evidence yet"
        description="Nothing is attached to this requirement. Link a saved example or record a new one."
      />
    ) : flow.status === 'needs_source' ? (
      <RecordState
        tone="warning"
        title="Evidence needs a source"
        description="Evidence is attached, but none of it is backed by a source yet."
      />
    ) : (
      <RecordState
        tone="success"
        title="Evidence ready"
        description="At least one supported example answers this requirement."
      />
    );

  const firstUnsourced = thread.evidence.find((entry) => entry.supportStatus !== 'supported');

  return (
    <>
      {strength}

      <Band
        label="Your evidence"
        detail={`${flow.attachedCount} ${flow.attachedCount === 1 ? 'record' : 'records'} · ${flow.supportedCount} supported`}
      >
        {thread.evidence.length === 0 ? (
          <p className="text-sm text-muted-foreground">No evidence is linked yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border border-y border-border">
            {thread.evidence.map((entry) => (
              <li key={entry.item.id} className="space-y-2 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <EvidenceReference id={entry.item.id} />
                  <EvidenceStamp status={entry.supportStatus} />
                </div>
                <p className="text-sm font-medium text-foreground">{entry.item.title}</p>
                {entry.link.relevance_note && (
                  <p className="text-xs leading-5 text-muted-foreground">{entry.link.relevance_note}</p>
                )}
                {entry.sources[0] ? (
                  <SourceReference
                    type={entry.sources[0].source_type as SourceReferenceType}
                    label={entry.sources[0].source_label}
                    detail={
                      entry.sources.length > 1 ? `+${entry.sources.length - 1} more sources` : 'Source attached'
                    }
                    href={entry.sources[0].source_url ?? undefined}
                  />
                ) : (
                  <p className="text-xs text-warning">
                    No source yet — this record stays unconfirmed without one.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Band>

      <Band label="Application material">
        {flow.materials.length === 0 ? (
          <p className="text-xs leading-5 text-muted-foreground">
            Nothing from this requirement is in your CV or interview practice yet.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {flow.materials.map((material) => (
              <li key={`${material.kind}:${material.label}:${material.detail ?? ''}`} className="flex items-start gap-2">
                {material.kind === 'cv' ? (
                  <FileText aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                ) : (
                  <Mic2 aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                )}
                <span className="min-w-0 text-xs leading-5">
                  <span className="font-medium text-foreground">{material.label}</span>
                  {material.detail && <span className="text-muted-foreground"> · {material.detail}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Band>

      <Band label="Next action" detail={flow.gap ?? 'Nothing outstanding for this requirement.'}>
        <div className="flex flex-wrap gap-2">
          {flow.nextAction.kind === 'link_evidence' && onFocusControl && (
            <Button
              type="button"
              size="sm"
              onClick={() => onFocusControl('requirements', `dossier-link-${thread.requirement.id}`)}
            >
              <Link2 aria-hidden="true" className="h-4 w-4" />
              Link evidence
            </Button>
          )}
          {flow.nextAction.kind === 'add_source' && firstUnsourced && onFocusControl && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onFocusControl('ledger', `dossier-source-${firstUnsourced.item.id}`)}
            >
              Add a source
            </Button>
          )}
          {(flow.nextAction.kind === 'open_cv' || flow.nextAction.kind === 'practice') && onFocusControl && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                onFocusControl(
                  flow.nextAction.kind === 'open_cv' ? 'cv' : 'interview',
                  flow.nextAction.kind === 'open_cv' ? 'dossier-application-cv' : 'dossier-start-practice',
                )
              }
            >
              {flow.nextAction.label}
            </Button>
          )}
          {flow.nextAction.kind === 'none' && (
            <p className="text-xs leading-5 text-muted-foreground">
              Your CV and interview practice both use this evidence. Nothing is outstanding here.
            </p>
          )}
        </div>
      </Band>
    </>
  );
}

function EvidenceBands({
  data,
  evidenceId,
  sourcesByEvidence,
  cvLinksByEvidence,
  applicationCvId,
  applicationCvTitle,
  confirmBusy,
  onFocusControl,
  onConfirmEvidence,
}: {
  data: DossierEvidenceData;
  evidenceId: string;
  sourcesByEvidence: Map<string, EvidenceSourceRow[]>;
  cvLinksByEvidence: Map<string, ResumeEvidenceLinkRow[]>;
  applicationCvId: string | null;
  applicationCvTitle: string | null;
  confirmBusy: boolean;
  onFocusControl?: (section: DossierSectionId, elementId: string) => void;
  onConfirmEvidence?: (evidenceId: string) => Promise<void>;
}) {
  const item = data.items.find((candidate) => candidate.id === evidenceId);
  if (!item) {
    return (
      <RecordState
        tone="warning"
        title="Evidence unavailable"
        description="This evidence is no longer available in the application."
      />
    );
  }

  const itemSources = sourcesByEvidence.get(item.id) ?? [];
  const status = deriveSupportStatus(item.review_status, itemSources.length);
  const requirements = data.links
    .filter((link) => link.evidence_id === item.id)
    .map((link) => ({
      link,
      requirement: data.requirements.find((requirement) => requirement.id === link.requirement_id),
    }))
    .filter((entry): entry is { link: typeof entry.link; requirement: NonNullable<typeof entry.requirement> } =>
      Boolean(entry.requirement),
    );

  const usedInCv = data.resumeLinks.some((link) => link.evidence_id === item.id);
  const usedInInterview = itemSources.some((source) => source.source_type === 'interview_response');
  const cvLinks = cvLinksByEvidence.get(item.id) ?? [];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <EvidenceReference id={item.id} />
        <EvidenceStamp status={status} />
      </div>

      <Band label="Job requirement">
        {requirements.length === 0 ? (
          <p className="text-sm leading-6 text-muted-foreground">Not linked to a requirement yet.</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {requirements.map(({ link, requirement }) => (
              <li key={link.id} className="border-l-2 border-border pl-3">
                <p className="text-sm font-medium text-foreground">{requirement.label}</p>
                {requirement.detail && (
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{requirement.detail}</p>
                )}
                {link.relevance_note && (
                  <p className="mt-1 text-xs text-muted-foreground">Relevance: {link.relevance_note}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Band>

      <Band label="Source">
        {itemSources.length === 0 ? (
          <p className="text-sm leading-6 text-muted-foreground">
            No source attached. A source is where this evidence can be seen or checked.
          </p>
        ) : (
          <div className="mt-2 space-y-2">
            {itemSources.map((source) => (
              <SourceReference
                key={source.id}
                type={source.source_type as SourceReferenceType}
                label={source.source_label}
                detail={source.source_excerpt}
                href={source.source_url ?? undefined}
              />
            ))}
          </div>
        )}
      </Band>

      <Band label="Application material">
        <ul className="mt-2 space-y-2">
          <li className="flex items-start gap-2 text-xs leading-5">
            <FileText aria-hidden="true" className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', usedInCv ? 'text-primary' : 'text-muted-foreground')} />
            {usedInCv ? (
              <span className="min-w-0">
                <span className="font-medium text-foreground">
                  {applicationCvId && cvLinks.some((link) => link.resume_id === applicationCvId)
                    ? applicationCvTitle || 'Application CV'
                    : 'Used in a CV'}
                </span>
                {cvLinks[0]?.entry_locator && (
                  <span className="block truncate text-muted-foreground">{cvLinks[0].entry_locator}</span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">Not used in an application CV yet</span>
            )}
          </li>
          <li className="flex items-start gap-2 text-xs leading-5">
            <Mic2
              aria-hidden="true"
              className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', usedInInterview ? 'text-primary' : 'text-muted-foreground')}
            />
            <span className={usedInInterview ? 'font-medium text-foreground' : 'text-muted-foreground'}>
              {usedInInterview ? 'Used in interview practice' : 'Not used in interview practice yet'}
            </span>
          </li>
        </ul>
      </Band>

      {status === 'draft' ? (
        <Band label="Next action" detail="Confirm this evidence when you are sure it is accurate.">
          {onConfirmEvidence && (
            <Button type="button" size="sm" disabled={confirmBusy} onClick={() => void onConfirmEvidence(item.id)}>
              {confirmBusy && <Spinner className="size-4" />}
              Confirm evidence
            </Button>
          )}
        </Band>
      ) : status === 'needs_source' ? (
        <Band label="Next action" detail="A source turns this into supported evidence.">
          {onFocusControl && (
            <Button type="button" size="sm" variant="outline" onClick={() => onFocusControl('ledger', `dossier-source-${item.id}`)}>
              Add a source
            </Button>
          )}
        </Band>
      ) : status === 'supported' ? (
        <RecordState
          tone="success"
          title="Ready to use"
          description="This evidence is confirmed and backed by a source you attached."
        />
      ) : null}
    </>
  );
}

/** One labelled band of the requirement → evidence → material → action chain. */
function Band({
  label,
  detail,
  children,
}: {
  label: string;
  detail?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="border-t border-border pt-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="dossier-eyebrow">{label}</p>
        {detail && <p className="text-[11px] text-muted-foreground">{detail}</p>}
      </div>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
