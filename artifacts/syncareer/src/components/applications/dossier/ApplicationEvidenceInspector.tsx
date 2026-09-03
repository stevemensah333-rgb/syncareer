import { useMemo, useState } from 'react';
import { FileText, Loader2, Mic2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DossierEvidenceData } from '@/features/application-dossier/dossier';
import { buildRequirementThreads } from '@/features/evidence/dossierViewModel';
import { deriveSupportStatus } from '@/features/evidence/supportStatus';
import type { EvidenceSourceRow } from '@/features/evidence/types';
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
  className?: string;
  /**
   * Contextual next-step actions. All optional: without them the inspector
   * stays read-only. Each callback moves focus to the matching control in
   * the center document (or performs the mutation directly for confirm).
   */
  onLinkEvidenceForRequirement?: (requirementId: string) => void;
  onAddRequirement?: () => void;
  onAddSourceForEvidence?: (evidenceId: string) => void;
  onConfirmEvidence?: (evidenceId: string) => Promise<boolean> | boolean;
}

/**
 * Right-zone context for the Application Dossier.
 *
 * It reads only the dossier bundle already loaded by the page. Selecting a
 * requirement shows what that requirement needs and which evidence answers
 * it; selecting evidence shows what it supports, where it lives, and
 * whether it is ready to be used. Each state ends in one concrete next step.
 */
export function ApplicationEvidenceInspector({
  data,
  selection,
  className,
  onLinkEvidenceForRequirement,
  onAddRequirement,
  onAddSourceForEvidence,
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

  const selectedRequirement =
    selection?.kind === 'requirement' ? data.requirements.find((item) => item.id === selection.id) ?? null : null;
  const selectedEvidence =
    selection?.kind === 'evidence' ? data.items.find((item) => item.id === selection.id) ?? null : null;

  const title = selectedRequirement
    ? selectedRequirement.label
    : selectedEvidence
      ? selectedEvidence.title
      : 'Evidence context';
  let description = 'Select a requirement or evidence item to inspect it.';
  if (selectedRequirement) {
    description =
      selectedRequirement.detail ??
      (selectedRequirement.origin === 'posting_skill' ? 'Listed on the posting' : 'Recorded requirement');
  } else if (selectedEvidence) {
    description = selectedEvidence.summary || 'Evidence record';
  }

  const body = buildBody({
    selection,
    data,
    threads,
    sourcesByEvidence,
    confirmBusy,
    onLinkEvidenceForRequirement,
    onAddRequirement,
    onAddSourceForEvidence,
    onConfirmEvidence: onConfirmEvidence
      ? async (evidenceId: string) => {
          setConfirmBusy(true);
          try {
            await onConfirmEvidence(evidenceId);
          } finally {
            setConfirmBusy(false);
          }
        }
      : undefined,
  });

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

interface BodyProps {
  selection: InspectorSelection;
  data: DossierEvidenceData;
  threads: ReturnType<typeof buildRequirementThreads>;
  sourcesByEvidence: Map<string, EvidenceSourceRow[]>;
  confirmBusy: boolean;
  onLinkEvidenceForRequirement?: (requirementId: string) => void;
  onAddRequirement?: () => void;
  onAddSourceForEvidence?: (evidenceId: string) => void;
  onConfirmEvidence?: (evidenceId: string) => Promise<void>;
}

function buildBody({
  selection,
  data,
  threads,
  sourcesByEvidence,
  confirmBusy,
  onLinkEvidenceForRequirement,
  onAddRequirement,
  onAddSourceForEvidence,
  onConfirmEvidence,
}: BodyProps) {
  if (!selection) {
    return (
      <>
        <p className="text-sm leading-6 text-muted-foreground">
          Pick a requirement or evidence record in the application to see its supporting context here.
        </p>
        {data.requirements.length === 0 && onAddRequirement && (
          <NextStep label="No requirements recorded yet.">
            <Button type="button" size="sm" onClick={onAddRequirement}>
              Add a requirement
            </Button>
          </NextStep>
        )}
      </>
    );
  }

  if (selection.kind === 'requirement') {
    const requirement = data.requirements.find((item) => item.id === selection.id);
    if (!requirement) {
      return (
        <RecordState
          tone="warning"
          title="Requirement unavailable"
          description="This requirement is no longer part of the application."
        />
      );
    }

    const thread = threads.find((entry) => entry.requirement.id === requirement.id);
    const linked = thread?.evidence ?? [];
    const supportedCount = linked.filter((entry) => entry.supportStatus === 'supported').length;
    const supported = supportedCount > 0;
    const firstUnsupported = linked.find((entry) => entry.supportStatus !== 'supported');

    return (
      <>
        {linked.length === 0 ? (
          <RecordState
            tone="warning"
            title="No evidence yet"
            description="Nothing is attached to this requirement. Link a saved example or record a new one."
          />
        ) : supported ? (
          <RecordState
            tone="success"
            title="Evidence ready"
            description="At least one supported example answers this requirement."
          />
        ) : (
          <RecordState
            tone="warning"
            title="Evidence needs a source"
            description="Evidence is attached, but none of it is backed by a source yet."
          />
        )}

        <div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="dossier-eyebrow">Attached evidence</p>
            <p className="text-[11px] font-medium text-muted-foreground">
              {linked.length} attached · {supportedCount} supported
            </p>
          </div>
          {linked.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No evidence is linked yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border border-y border-border">
              {linked.map((entry) => (
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
                      detail={entry.sources.length > 1 ? `+${entry.sources.length - 1} more sources` : 'Source attached'}
                      href={entry.sources[0].source_url ?? undefined}
                    />
                  ) : (
                    <p className="text-xs text-warning">No source yet — the stamp stays unconfirmed without one.</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {linked.length === 0 && onLinkEvidenceForRequirement ? (
          <NextStep label="Link evidence that answers this requirement.">
            <Button type="button" size="sm" onClick={() => onLinkEvidenceForRequirement(requirement.id)}>
              Link evidence
            </Button>
          </NextStep>
        ) : !supported && firstUnsupported && onAddSourceForEvidence ? (
          <NextStep label="Attach a source to make this evidence usable.">
            <Button type="button" size="sm" variant="outline" onClick={() => onAddSourceForEvidence(firstUnsupported.item.id)}>
              Add a source
            </Button>
          </NextStep>
        ) : supported ? (
          <NextStep label="Ready for application materials. Use it in the CV or interview practice." />
        ) : null}
      </>
    );
  }

  const item = data.items.find((candidate) => candidate.id === selection.id);
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
    .filter(
      (entry): entry is { link: (typeof entry)['link']; requirement: NonNullable<(typeof entry)['requirement']> } =>
        Boolean(entry.requirement),
    );

  const usedInCv = data.resumeLinks.some((link) => link.evidence_id === item.id);
  const usedInInterview = itemSources.some((source) => source.source_type === 'interview_response');

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <EvidenceReference id={item.id} />
        <EvidenceStamp status={status} />
      </div>

      <div>
        <p className="dossier-eyebrow">Supports</p>
        {requirements.length === 0 ? (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Not linked to a requirement yet.</p>
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
      </div>

      <div>
        <p className="dossier-eyebrow">Source and context</p>
        {itemSources.length === 0 ? (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            No source attached. A source is where this record can be seen or checked.
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
      </div>

      <div className="border-t border-border pt-4">
        <p className="dossier-eyebrow">Used in</p>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className={cn('inline-flex items-center gap-1.5', usedInCv && 'text-foreground')}>
            <FileText aria-hidden="true" className="h-3.5 w-3.5" />
            {usedInCv ? 'Application CV' : 'Not in an application CV'}
          </span>
          <span className={cn('inline-flex items-center gap-1.5', usedInInterview && 'text-foreground')}>
            <Mic2 aria-hidden="true" className="h-3.5 w-3.5" />
            {usedInInterview ? 'Interview practice' : 'Not in interview practice'}
          </span>
        </div>
      </div>

      {status === 'draft' ? (
        <NextStep label="Confirm this evidence when you are confident it is accurate.">
          {onConfirmEvidence && (
            <Button
              type="button"
              size="sm"
              disabled={confirmBusy}
              onClick={() => void onConfirmEvidence(item.id)}
            >
              {confirmBusy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />}
              Confirm evidence
            </Button>
          )}
        </NextStep>
      ) : status === 'needs_source' && onAddSourceForEvidence ? (
        <NextStep label="Attach a source to turn this into supported evidence.">
          <Button type="button" size="sm" variant="outline" onClick={() => onAddSourceForEvidence(item.id)}>
            Add a source
          </Button>
        </NextStep>
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

function NextStep({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className="border-t border-border pt-4">
      <p className="dossier-eyebrow">Next step</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{label}</p>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
