import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, FileText, Link2, ListPlus, Mic2, Plus, Trash2, Unlink } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { EvidenceThread } from '@/components/dossier';
import { buildRequirementThreads, type RequirementThread } from '@/features/evidence/dossierViewModel';
import { supportStatusPresentation } from '@/features/evidence/supportStatus';
import {
  describeRequirementFlow,
  groupCvLinksByEvidence,
  type RequirementFlow,
} from '@/features/application-dossier/requirementFlow';
import type {
  ApplicationRequirementRow,
  EvidenceItemRow,
  EvidenceSourceRow,
  EvidenceSupportStatus,
  ResumeEvidenceLinkRow,
  ApplicationEvidenceLinkRow,
} from '@/features/evidence/types';

/**
 * Requirements-and-evidence section: the dossier's spine rendered one
 * requirement at a time.
 *
 *   job requirement → your evidence → application material → next action
 *
 * Each band shows only what is stored: the requirement's own text, the
 * evidence linked to it, the CV/interview usage recorded against that evidence,
 * and the single next action the current state implies. The parent page owns
 * the data and mutation handlers; this component owns its dialog state.
 */

export interface RequirementHandlers {
  onLinkEvidence: (requirementId: string, evidenceId: string, relevanceNote: string | null) => Promise<boolean>;
  onUnlinkEvidence: (requirementId: string, evidenceId: string) => Promise<boolean>;
  onImportPostingSkills: () => Promise<string | null>;
  onAddManualRequirement: (label: string, detail: string | null) => Promise<string | null>;
  onRemoveRequirement: (requirementId: string) => Promise<boolean>;
}

interface Props extends RequirementHandlers {
  requirements: ApplicationRequirementRow[];
  links: ApplicationEvidenceLinkRow[];
  items: EvidenceItemRow[];
  sources: EvidenceSourceRow[];
  resumeLinks: ResumeEvidenceLinkRow[];
  postingSkillCount: number;
  busy: boolean;
  selectedRequirementId?: string | null;
  onSelectRequirement?: (requirementId: string) => void;
  selectedEvidenceId?: string | null;
  onSelectEvidence?: (evidenceId: string) => void;
  /** The application's own CV, when one is linked. Never assumed. */
  applicationCvId: string | null;
  applicationCvTitle: string | null;
  cvHref: string;
  interviewHref: string;
  /** Moves focus to the source control of one evidence record in the ledger. */
  onRequestSourceForEvidence: (evidenceId: string) => void;
}

function statusText(status: EvidenceSupportStatus): string {
  return supportStatusPresentation(status).description;
}

export function DossierRequirementsEvidence({
  requirements,
  links,
  items,
  sources,
  resumeLinks,
  postingSkillCount,
  busy,
  selectedRequirementId,
  onSelectRequirement,
  selectedEvidenceId,
  onSelectEvidence,
  applicationCvId,
  applicationCvTitle,
  cvHref,
  interviewHref,
  onRequestSourceForEvidence,
  onLinkEvidence,
  onUnlinkEvidence,
  onImportPostingSkills,
  onAddManualRequirement,
  onRemoveRequirement,
}: Props) {
  const [linkTarget, setLinkTarget] = useState<{ id: string; label: string } | null>(null);
  const [linkCandidateId, setLinkCandidateId] = useState<string>('');
  const [relevanceNote, setRelevanceNote] = useState('');
  const [linkBusy, setLinkBusy] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualLabel, setManualLabel] = useState('');
  const [manualDetail, setManualDetail] = useState('');
  const [manualBusy, setManualBusy] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [justLinked, setJustLinked] = useState<string | null>(null);

  const threads: RequirementThread[] = useMemo(
    () => buildRequirementThreads(requirements, links, items, sources, resumeLinks),
    [requirements, links, items, sources, resumeLinks],
  );

  const flows = useMemo(() => {
    const cvLinksByEvidence = groupCvLinksByEvidence(resumeLinks);
    const map = new Map<string, RequirementFlow>();
    for (const thread of threads) {
      map.set(
        thread.requirement.id,
        describeRequirementFlow(thread, {
          cvLinksByEvidence,
          applicationCvId,
          applicationCvTitle,
        }),
      );
    }
    return map;
  }, [threads, resumeLinks, applicationCvId, applicationCvTitle]);

  const supportedCount = threads.filter(
    (thread) => (flows.get(thread.requirement.id)?.supportedCount ?? 0) > 0,
  ).length;

  // The flash is a one-tick confirmation that a link landed; it clears itself
  // so a row never looks "just added" while the student reads it later.
  useEffect(() => {
    if (!justLinked) return;
    const timer = window.setTimeout(() => setJustLinked(null), 900);
    return () => window.clearTimeout(timer);
  }, [justLinked]);

  // Linked evidence cannot be linked a second time; archived evidence is
  // never offered for new links.
  const linkableItems = useMemo(() => {
    if (!linkTarget) return [];
    const linkedIds = new Set(links.filter((l) => l.requirement_id === linkTarget.id).map((l) => l.evidence_id));
    return items.filter((item) => item.review_status !== 'archived' && !linkedIds.has(item.id));
  }, [items, links, linkTarget]);

  useEffect(() => {
    if (!linkTarget) {
      setLinkCandidateId('');
      setRelevanceNote('');
    }
  }, [linkTarget]);

  const openLinkDialog = (requirementId: string, requirementLabel: string) => {
    setLinkTarget({ id: requirementId, label: requirementLabel });
    setImportMessage(null);
  };

  const submitLink = async () => {
    if (!linkTarget || !linkCandidateId) return;
    setLinkBusy(true);
    const ok = await onLinkEvidence(linkTarget.id, linkCandidateId, relevanceNote.trim() || null);
    setLinkBusy(false);
    if (ok) {
      setJustLinked(`${linkTarget.id}:${linkCandidateId}`);
      setLinkTarget(null);
    }
  };

  const submitManual = async () => {
    setManualBusy(true);
    const failure = await onAddManualRequirement(manualLabel, manualDetail.trim() || null);
    setManualBusy(false);
    if (!failure) {
      setManualOpen(false);
      setManualLabel('');
      setManualDetail('');
    }
  };

  const submitImport = async () => {
    const failure = await onImportPostingSkills();
    setImportMessage(failure ?? 'Skills from the listing are up to date.');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {postingSkillCount > 0 && (
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={submitImport}>
              <ListPlus aria-hidden="true" className="h-4 w-4" />
              Add skills from the listing
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => setManualOpen(true)}
            id="dossier-add-requirement"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add requirement
          </Button>
          {importMessage && <p className="text-xs text-muted-foreground">{importMessage}</p>}
        </div>
        {threads.length > 0 && (
          <p className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
            {supportedCount} of {threads.length} requirements have supported evidence
          </p>
        )}
      </div>

      {threads.length === 0 ? (
        <p className="border-y border-border py-6 text-sm text-muted-foreground">
          No requirements recorded yet. Add the skills the job listing asks for, or write your own, so your
          evidence has something concrete to answer.
        </p>
      ) : (
        threads.map((thread) => {
          const flow = flows.get(thread.requirement.id);
          if (!flow) return null;
          const firstUnsourced = thread.evidence.find((entry) => entry.supportStatus !== 'supported');
          return (
            <div key={thread.requirement.id} className="border-b border-border last:border-b-0">
              <EvidenceThread
                requirement={thread.requirement.label}
                detail={
                  thread.requirement.detail ??
                  (thread.requirement.origin === 'posting_skill' ? 'From the job listing' : undefined)
                }
                // `uses` is deliberately not passed: the application-material band
                // below states the same fact with its source detail attached.
                evidence={thread.evidence.map((entry) => ({
                  id: entry.item.id,
                  title: entry.item.title,
                  summary: statusText(entry.supportStatus),
                  note: entry.link.relevance_note ?? undefined,
                  status: entry.supportStatus,
                  flash: justLinked === `${thread.requirement.id}:${entry.item.id}`,
                }))}
                selected={thread.requirement.id === selectedRequirementId}
                onSelectRequirement={
                  onSelectRequirement ? () => onSelectRequirement(thread.requirement.id) : undefined
                }
                selectedEvidenceId={selectedEvidenceId ?? undefined}
                onSelectEvidence={onSelectEvidence}
                material={<MaterialBand flow={flow} />}
                nextAction={
                  <NextActionBand
                    flow={flow}
                    requirementId={thread.requirement.id}
                    requirementLabel={thread.requirement.label}
                    firstUnsourcedEvidenceId={firstUnsourced?.item.id ?? null}
                    cvHref={cvHref}
                    interviewHref={interviewHref}
                    onLinkEvidence={openLinkDialog}
                    onRequestSource={onRequestSourceForEvidence}
                  />
                }
                editActions={
                  <>
                    {thread.evidence.map((entry) => (
                      <Button
                        key={entry.item.id}
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => void onUnlinkEvidence(thread.requirement.id, entry.item.id)}
                      >
                        <Unlink aria-hidden="true" className="h-4 w-4" />
                        Unlink {entry.item.title.length > 24 ? `${entry.item.title.slice(0, 24)}…` : entry.item.title}
                      </Button>
                    ))}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="ml-auto text-destructive hover:text-destructive"
                      disabled={busy}
                      onClick={() => void onRemoveRequirement(thread.requirement.id)}
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                      Remove requirement
                    </Button>
                  </>
                }
              />
            </div>
          );
        })
      )}

      <Dialog open={linkTarget !== null} onOpenChange={(open) => !open && setLinkTarget(null)}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Link evidence to “{linkTarget?.label}”</DialogTitle>
            <DialogDescription>
              Choose a saved evidence record. Archived or already linked evidence is not offered.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {linkableItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing eligible yet. Save evidence in the Evidence section first.
              </p>
            ) : (
              <fieldset className="space-y-2">
                <legend className="dossier-eyebrow">Evidence</legend>
                {linkableItems.map((item) => (
                  <label key={item.id} className="flex min-h-11 cursor-pointer items-center gap-3 border border-border px-3 py-2 text-sm transition-colors duration-150 hover:bg-muted focus-within:outline-none focus-within:ring-2 focus-within:ring-ring">
                    <input
                      type="radio"
                      name="link-candidate"
                      value={item.id}
                      checked={linkCandidateId === item.id}
                      onChange={() => setLinkCandidateId(item.id)}
                      className="accent-[hsl(var(--primary))]"
                    />
                    <span className="min-w-0 truncate font-medium">{item.title}</span>
                  </label>
                ))}
              </fieldset>
            )}
            <div className="space-y-1.5">
              <label htmlFor="relevance-note" className="dossier-eyebrow">
                Relevance note (optional)
              </label>
              <Textarea
                id="relevance-note"
                value={relevanceNote}
                onChange={(event) => setRelevanceNote(event.target.value)}
                maxLength={500}
                rows={2}
                placeholder="One line on how this evidence answers the requirement."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLinkTarget(null)}>
              Cancel
            </Button>
            <Button type="button" disabled={!linkCandidateId || linkBusy} onClick={submitLink}>
              {linkBusy && <Spinner className="size-4" />}
              Link evidence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Add a requirement</DialogTitle>
            <DialogDescription>
              Record something the role clearly asks for that the listing did not list as a skill.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="manual-label" className="dossier-eyebrow">
                Requirement
              </label>
              <Input
                id="manual-label"
                value={manualLabel}
                onChange={(event) => setManualLabel(event.target.value)}
                maxLength={160}
                placeholder="e.g. Availability for weekend shifts"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="manual-detail" className="dossier-eyebrow">
                Detail (optional)
              </label>
              <Textarea
                id="manual-detail"
                value={manualDetail}
                onChange={(event) => setManualDetail(event.target.value)}
                maxLength={1000}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setManualOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={manualBusy || manualLabel.trim().length === 0} onClick={submitManual}>
              {manualBusy && <Spinner className="size-4" />}
              Add requirement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Application-material band: CV and interview usage actually recorded. */
function MaterialBand({ flow }: { flow: RequirementFlow }) {
  if (flow.materials.length === 0) {
    return (
      <p className="text-xs leading-5 text-muted-foreground">
        Nothing from this requirement is in your CV or interview practice yet.
      </p>
    );
  }
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
      {flow.materials.map((material) => (
        <li
          key={`${material.kind}:${material.label}:${material.detail ?? ''}`}
          className="flex min-w-0 items-center gap-1.5 text-xs"
        >
          {material.kind === 'cv' ? (
            <FileText aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-primary" />
          ) : (
            <Mic2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-primary" />
          )}
          <span className="truncate font-medium text-foreground">{material.label}</span>
          {material.detail && <span className="truncate text-muted-foreground">· {material.detail}</span>}
        </li>
      ))}
    </ul>
  );
}

/** Next-action band: one primary step, derived from the requirement's state. */
function NextActionBand({
  flow,
  requirementId,
  requirementLabel,
  firstUnsourcedEvidenceId,
  cvHref,
  interviewHref,
  onLinkEvidence,
  onRequestSource,
}: {
  flow: RequirementFlow;
  requirementId: string;
  requirementLabel: string;
  firstUnsourcedEvidenceId: string | null;
  cvHref: string;
  interviewHref: string;
  onLinkEvidence: (requirementId: string, requirementLabel: string) => void;
  onRequestSource: (evidenceId: string) => void;
}) {
  const detail =
    flow.status === 'covered'
      ? `Your CV and interview practice both use ${flow.attachedCount === 1 ? 'the linked record' : `${flow.attachedCount} linked records`}.`
      : (flow.gap ?? 'Nothing outstanding for this requirement.');

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="min-w-0 flex-1 text-xs leading-5 text-muted-foreground">{detail}</p>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {flow.nextAction.kind === 'link_evidence' && (
          <Button
            type="button"
            size="sm"
            id={`dossier-link-${requirementId}`}
            aria-label={`Link evidence to ${requirementLabel}`}
            onClick={() => onLinkEvidence(requirementId, requirementLabel)}
          >
            <Link2 aria-hidden="true" className="h-4 w-4" />
            Link evidence
          </Button>
        )}
        {flow.nextAction.kind === 'add_source' && firstUnsourcedEvidenceId && (
          <Button type="button" size="sm" onClick={() => onRequestSource(firstUnsourcedEvidenceId)}>
            Add a source
          </Button>
        )}
        {flow.nextAction.kind === 'open_cv' && (
          <Button type="button" size="sm" asChild>
            <Link to={cvHref}>
              <FileText aria-hidden="true" className="h-4 w-4" />
              {flow.nextAction.label}
            </Link>
          </Button>
        )}
        {flow.nextAction.kind === 'practice' && (
          <Button type="button" size="sm" variant="outline" asChild>
            <Link to={interviewHref}>
              <Mic2 aria-hidden="true" className="h-4 w-4" />
              {flow.nextAction.label}
            </Link>
          </Button>
        )}
        {flow.nextAction.kind === 'none' && (
          <span className="inline-flex min-h-7 items-center gap-1.5 border border-success/50 bg-[hsl(var(--dossier-jade-wash))] px-2 text-[11px] font-semibold text-success">
            <Check aria-hidden="true" className="h-3.5 w-3.5" />
            Requirement answered
          </span>
        )}
      </div>
    </div>
  );
}
