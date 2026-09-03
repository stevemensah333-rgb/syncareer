import { useMemo } from 'react';
import { FileText, Mic2 } from 'lucide-react';
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
}

/**
 * Right-zone context for the Application Dossier.
 *
 * It reads only the dossier bundle already loaded by the page. Selecting a
 * requirement shows what that requirement needs and which evidence is
 * attached; selecting evidence shows what it supports, where it lives, and
 * whether it is ready to be used.
 */
export function ApplicationEvidenceInspector({ data, selection, className }: ApplicationEvidenceInspectorProps) {
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

  const title =
    selection?.kind === 'requirement'
      ? data.requirements.find((item) => item.id === selection.id)?.label ?? 'Requirement'
      : selection?.kind === 'evidence'
        ? data.items.find((item) => item.id === selection.id)?.title ?? 'Evidence'
        : 'Evidence context';
  const selectedRequirementForTitle = selection?.kind === 'requirement'
    ? data.requirements.find((item) => item.id === selection.id)
    : null;
  const selectedEvidenceForTitle = selection?.kind === 'evidence'
    ? data.items.find((item) => item.id === selection.id)
    : null;
  let description = 'Select a requirement or evidence item to inspect it.';
  if (selectedRequirementForTitle) {
    description =
      selectedRequirementForTitle.detail ??
      (selectedRequirementForTitle.origin === 'posting_skill' ? 'Listed on the posting' : 'Recorded requirement');
  } else if (selectedEvidenceForTitle) {
    description = selectedEvidenceForTitle.summary || 'Evidence record';
  }
  const body = buildBody({ selection, data, threads, sourcesByEvidence });

  return (
    <EvidenceInspector title={title} description={description} className={cn('shadow-card', className)}>
      {body}
    </EvidenceInspector>
  );
}

interface BodyProps {
  selection: InspectorSelection;
  data: DossierEvidenceData;
  threads: ReturnType<typeof buildRequirementThreads>;
  sourcesByEvidence: Map<string, EvidenceSourceRow[]>;
}

function buildBody({ selection, data, threads, sourcesByEvidence }: BodyProps) {
  if (!selection) {
    return (
      <p className="text-sm leading-6 text-muted-foreground">
        Pick a requirement or evidence record in the application to see its supporting context here.
      </p>
    );
  }

  if (selection.kind === 'requirement') {
    const requirement = data.requirements.find((item) => item.id === selection.id);
    if (!requirement) {
      return <RecordState tone="warning" title="Requirement unavailable" description="This requirement is no longer part of the application." />;
    }

    const thread = threads.find((entry) => entry.requirement.id === requirement.id);
    const linked = thread?.evidence ?? [];
    const supported = linked.some((entry) => entry.supportStatus === 'supported');
    const needsMore = linked.length === 0 || !supported;

    return (
      <>
        {needsMore ? (
          <RecordState
            tone="warning"
            title="More evidence needed"
            description={
              linked.length === 0
                ? 'No evidence is attached to this requirement yet.'
                : 'Evidence is attached, but it is not supported by a source. Add or confirm evidence before using it.'
            }
          />
        ) : (
          <RecordState
            tone="success"
            title="Evidence ready"
            description="At least one supported example answers this requirement."
          />
        )}

        <div>
          <p className="dossier-eyebrow">Attached evidence</p>
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
                </li>
              ))}
            </ul>
          )}
        </div>
      </>
    );
  }

  const item = data.items.find((candidate) => candidate.id === selection.id);
  if (!item) {
    return <RecordState tone="warning" title="Evidence unavailable" description="This evidence is no longer available in the application." />;
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
  const needsMore = status === 'draft' || status === 'needs_source';

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
                {requirement.detail && <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{requirement.detail}</p>}
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
          <RecordState
            tone="warning"
            title="Source still needed"
            description="This record has no source attached. Confirm it or attach a source before using it as supported evidence."
          />
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

      {needsMore ? (
        <RecordState
          tone="warning"
          title="More evidence needed"
          description={
            status === 'draft'
              ? 'Confirm this evidence when you are confident it is accurate.'
              : 'Attach a source to turn this record into supported evidence.'
          }
        />
      ) : (
        <RecordState
          tone="success"
          title="Ready to use"
          description="This evidence is confirmed and backed by a source you attached."
        />
      )}
    </>
  );
}
