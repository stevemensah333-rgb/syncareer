import { useEffect, useMemo, useState } from 'react';
import { Link2, Loader2, Plus, Sparkles, Trash2, Unlink } from 'lucide-react';
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
import type {
  ApplicationRequirementRow,
  EvidenceItemRow,
  EvidenceSourceRow,
  EvidenceSupportStatus,
  ResumeEvidenceLinkRow,
  ApplicationEvidenceLinkRow,
} from '@/features/evidence/types';

/**
 * Requirements-and-evidence section of the dossier: one thread per explicit
 * requirement, with link/unlink flows. The parent page owns the data and
 * mutation handlers; this component owns only its dialog state.
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
  onLinkEvidence,
  onUnlinkEvidence,
  onImportPostingSkills,
  onAddManualRequirement,
  onRemoveRequirement,
}: Props) {
  const [linkTarget, setLinkTarget] = useState<ApplicationRequirementRow | null>(null);
  const [linkCandidateId, setLinkCandidateId] = useState<string>('');
  const [relevanceNote, setRelevanceNote] = useState('');
  const [linkBusy, setLinkBusy] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualLabel, setManualLabel] = useState('');
  const [manualDetail, setManualDetail] = useState('');
  const [manualBusy, setManualBusy] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const threads: RequirementThread[] = useMemo(
    () => buildRequirementThreads(requirements, links, items, sources, resumeLinks),
    [requirements, links, items, sources, resumeLinks],
  );

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

  const openLinkDialog = (requirement: ApplicationRequirementRow) => {
    setLinkTarget(requirement);
    setImportMessage(null);
  };

  const submitLink = async () => {
    if (!linkTarget || !linkCandidateId) return;
    setLinkBusy(true);
    const ok = await onLinkEvidence(linkTarget.id, linkCandidateId, relevanceNote.trim() || null);
    setLinkBusy(false);
    if (ok) setLinkTarget(null);
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
    setImportMessage(failure ?? `Posting skills are up to date.`);
    if (!failure) setImportMessage('Posting skills imported.');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {postingSkillCount > 0 && (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={submitImport}>
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            Import posting skills
          </Button>
        )}
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setManualOpen(true)}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add requirement
        </Button>
        {importMessage && <p className="text-xs text-muted-foreground">{importMessage}</p>}
      </div>

      {threads.length === 0 ? (
        <p className="border-y border-border py-6 text-sm text-muted-foreground">
          No requirements recorded yet. Import the posting&rsquo;s listed skills or add your own so evidence has
          something concrete to answer.
        </p>
      ) : (
        threads.map((thread) => (
          <div key={thread.requirement.id} className="border-b border-border last:border-b-0">
            <EvidenceThread
              requirement={thread.requirement.label}
              detail={
                thread.requirement.detail ??
                (thread.requirement.origin === 'posting_skill' ? 'Listed on the posting' : undefined)
              }
              evidence={thread.evidence.map((entry) => ({
                id: entry.item.id,
                title: entry.item.title,
                summary: statusText(entry.supportStatus),
                status: entry.supportStatus,
                uses: [
                  ...(entry.usedInCv ? (['cv'] as const) : []),
                  ...(entry.usedInInterview ? (['interview'] as const) : []),
                ],
              }))}
            />
            <div className="flex flex-wrap items-center gap-2 px-3 pb-3 md:px-4">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => openLinkDialog(thread.requirement)}
              >
                <Link2 aria-hidden="true" className="h-4 w-4" />
                Link evidence
              </Button>
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
                Remove
              </Button>
            </div>
          </div>
        ))
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
                Nothing eligible yet. Create evidence in the ledger below first.
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
              {linkBusy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />}
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
              Record something the role clearly asks for that the posting did not list as a skill.
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
              {manualBusy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />}
              Add requirement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
