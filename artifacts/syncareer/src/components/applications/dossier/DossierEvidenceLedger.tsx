import { useState } from 'react';
import { Archive, Check, Plus, Trash2 } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EvidenceReference, EvidenceStamp, RecordList, RecordRow, SourceReference } from '@/components/dossier';
import { EVIDENCE_CATEGORIES, EVIDENCE_SOURCE_TYPES } from '@/features/evidence/validation';
import { deriveSupportStatus } from '@/features/evidence/supportStatus';
import type {
  ApplicationEvidenceLinkRow,
  ApplicationRequirementRow,
  EvidenceCategory,
  EvidenceItemRow,
  EvidenceSourceRow,
  EvidenceSourceType,
} from '@/features/evidence/types';

/**
 * The evidence list: every saved piece of evidence with its sources, plus the
 * create / confirm / archive / source flows that keep it honest. The parent
 * page owns data and mutations; this component owns dialog state.
 */

export interface LedgerHandlers {
  onCreateEvidence: (input: { category: EvidenceCategory; title: string; summary: string; occurredOn: string | null }) => Promise<string | null>;
  onConfirmEvidence: (evidenceId: string) => Promise<boolean>;
  onArchiveEvidence: (evidenceId: string) => Promise<boolean>;
  onAddSource: (input: {
    evidenceId: string;
    sourceType: EvidenceSourceType;
    sourceLabel: string;
    sourceExcerpt: string;
    sourceUrl: string | null;
    entryLocator: string | null;
    resumeId: string | null;
    interviewId: string | null;
  }) => Promise<string | null>;
  onRemoveSource: (sourceId: string) => Promise<boolean>;
}

interface Props extends LedgerHandlers {
  items: EvidenceItemRow[];
  sources: EvidenceSourceRow[];
  /** The application's requirements, so each record can say what it answers. */
  requirements: ApplicationRequirementRow[];
  requirementLinks: ApplicationEvidenceLinkRow[];
  resumes: Array<{ id: string; title: string | null }>;
  interviews: Array<{ id: string; label: string }>;
  busy: boolean;
  selectedEvidenceId?: string | null;
  onSelectEvidence?: (evidenceId: string) => void;
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  resume_entry: 'CV entry',
  interview_response: 'Interview answer',
  url: 'Web link',
  manual_note: 'Manual note',
};

/** One requirement by name, several by count — never a vague "in use". */
function describeAnswers(labels: string[]): string {
  if (labels.length === 0) return 'Not linked to a requirement yet';
  if (labels.length === 1) {
    const [label = ''] = labels;
    return `Answers “${label.length > 28 ? `${label.slice(0, 28)}…` : label}”`;
  }
  return `Answers ${labels.length} requirements`;
}

export function DossierEvidenceLedger({
  items,
  sources,
  requirements,
  requirementLinks,
  resumes,
  interviews,
  busy,
  selectedEvidenceId,
  onSelectEvidence,
  onCreateEvidence,
  onConfirmEvidence,
  onArchiveEvidence,
  onAddSource,
  onRemoveSource,
}: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [category, setCategory] = useState<EvidenceCategory>('work');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [occurredOn, setOccurredOn] = useState('');
  const [createBusy, setCreateBusy] = useState(false);

  const [sourceTarget, setSourceTarget] = useState<EvidenceItemRow | null>(null);
  const [sourceType, setSourceType] = useState<EvidenceSourceType>('manual_note');
  const [sourceLabel, setSourceLabel] = useState('');
  const [sourceExcerpt, setSourceExcerpt] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [entryLocator, setEntryLocator] = useState('');
  const [sourceResumeId, setSourceResumeId] = useState<string>('');
  const [sourceInterviewId, setSourceInterviewId] = useState<string>('');
  const [sourceBusy, setSourceBusy] = useState(false);
  const [sourceMessage, setSourceMessage] = useState<string | null>(null);

  const sourcesByEvidence = new Map<string, EvidenceSourceRow[]>();
  for (const source of sources) {
    const existing = sourcesByEvidence.get(source.evidence_id);
    if (existing) existing.push(source);
    else sourcesByEvidence.set(source.evidence_id, [source]);
  }

  // Which requirements each record answers. Evidence that answers nothing is
  // stated as unlinked instead of quietly sitting in the list.
  const requirementsByEvidence = new Map<string, string[]>();
  for (const link of requirementLinks) {
    const label = requirements.find((requirement) => requirement.id === link.requirement_id)?.label;
    if (!label) continue;
    const existing = requirementsByEvidence.get(link.evidence_id);
    if (existing) existing.push(label);
    else requirementsByEvidence.set(link.evidence_id, [label]);
  }

  const openCreate = () => {
    setCategory('work');
    setTitle('');
    setSummary('');
    setOccurredOn('');
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    setCreateBusy(true);
    const failure = await onCreateEvidence({ category, title, summary, occurredOn: occurredOn || null });
    setCreateBusy(false);
    if (!failure) setCreateOpen(false);
  };

  const openSourceDialog = (item: EvidenceItemRow) => {
    setSourceTarget(item);
    setSourceType('manual_note');
    setSourceLabel('');
    setSourceExcerpt('');
    setSourceUrl('');
    setEntryLocator('');
    setSourceResumeId('');
    setSourceInterviewId('');
    setSourceMessage(null);
  };

  const submitSource = async () => {
    if (!sourceTarget) return;
    setSourceBusy(true);
    const failure = await onAddSource({
      evidenceId: sourceTarget.id,
      sourceType,
      sourceLabel,
      sourceExcerpt,
      sourceUrl: sourceType === 'url' ? sourceUrl : null,
      entryLocator: entryLocator.trim() || null,
      resumeId: sourceType === 'resume_entry' ? sourceResumeId || null : null,
      interviewId: sourceType === 'interview_response' ? sourceInterviewId || null : null,
    });
    setSourceBusy(false);
    setSourceMessage(failure);
    if (!failure) setSourceTarget(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={openCreate} disabled={busy}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          New evidence
        </Button>
        <p className="text-xs text-muted-foreground">
          Evidence is something you actually did or can show. Saving never confirms it; confirming is a separate,
          deliberate step.
        </p>
      </div>

      {items.length === 0 ? (
        <p className="border-y border-border py-6 text-sm text-muted-foreground">
          No evidence saved yet. Add specific, checkable examples — they become reusable across every application.
        </p>
      ) : (
        <RecordList label="Evidence records">
          {items.map((item) => {
            const itemSources = sourcesByEvidence.get(item.id) ?? [];
            const status = deriveSupportStatus(item.review_status, itemSources.length);
            return (
              <RecordRow
                key={item.id}
                eyebrow={item.category}
                title={item.title}
                detail={item.summary}
                meta={
                  <div className="flex flex-wrap items-center gap-2">
                    <EvidenceReference id={item.id} />
                    <span
                      className={
                        (requirementsByEvidence.get(item.id)?.length ?? 0) === 0
                          ? 'text-warning'
                          : 'text-muted-foreground'
                      }
                    >
                      {describeAnswers(requirementsByEvidence.get(item.id) ?? [])}
                    </span>
                    {onSelectEvidence && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label={`Show context for ${item.title}`}
                        onClick={() => onSelectEvidence(item.id)}
                      >
                        Context
                      </Button>
                    )}
                  </div>
                }
                status={
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                    <EvidenceStamp status={status} />
                    {item.review_status === 'draft' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        aria-label={`Confirm ${item.title}`}
                        onClick={() => void onConfirmEvidence(item.id)}
                      >
                        <Check aria-hidden="true" className="h-4 w-4" />
                        Confirm
                      </Button>
                    )}
                    {item.review_status !== 'archived' && (
                      <>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        aria-label={`Add source to ${item.title}`}
                        onClick={() => openSourceDialog(item)}
                        id={`dossier-source-${item.id}`}
                      >
                        Source
                      </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          aria-label={`Archive ${item.title}`}
                          onClick={() => void onArchiveEvidence(item.id)}
                        >
                          <Archive aria-hidden="true" className="h-4 w-4" />
                          Archive
                        </Button>
                      </>
                    )}
                  </div>
                }
                selected={item.id === selectedEvidenceId}
              />
            );
          })}
        </RecordList>
      )}

      {sources.length > 0 && (
        <div className="space-y-2">
          <p className="dossier-eyebrow">Attached sources</p>
          <div className="space-y-2">
            {sources.map((source) => {
              const owner = items.find((item) => item.id === source.evidence_id);
              return (
                <div key={source.id} className="flex items-center gap-2">
                  <SourceReference
                    type={source.source_type}
                    label={source.source_label}
                    detail={
                      [owner?.title, SOURCE_TYPE_LABELS[source.source_type] ?? source.source_type]
                        .filter(Boolean)
                        .join(' · ')
                    }
                    href={source.source_url ?? undefined}
                    className="min-w-0 flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    aria-label={`Remove source ${source.source_label}`}
                    onClick={() => void onRemoveSource(source.id)}
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>New evidence</DialogTitle>
            <DialogDescription>
              Saved evidence starts as a draft. Confirm it once you are confident it is accurate and complete.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="evidence-category" className="dossier-eyebrow">
                Category
              </label>
              <Select value={category} onValueChange={(value) => setCategory(value as EvidenceCategory)}>
                <SelectTrigger id="evidence-category" aria-label="Evidence category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVIDENCE_CATEGORIES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="evidence-title" className="dossier-eyebrow">
                Title
              </label>
              <Input
                id="evidence-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={120}
                placeholder="e.g. Rebuilt the debate society dues ledger"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="evidence-summary" className="dossier-eyebrow">
                Summary
              </label>
              <Textarea
                id="evidence-summary"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                maxLength={1200}
                rows={4}
                placeholder="What you did, with concrete details you could defend in an interview."
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="evidence-occurred" className="dossier-eyebrow">
                Date (optional)
              </label>
              <Input
                id="evidence-occurred"
                type="date"
                value={occurredOn}
                onChange={(event) => setOccurredOn(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={createBusy || !title.trim() || !summary.trim()} onClick={submitCreate}>
              {createBusy && <Spinner className="size-4" />}
              Save as draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sourceTarget !== null} onOpenChange={(open) => !open && setSourceTarget(null)}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Add a source — “{sourceTarget?.title}”</DialogTitle>
            <DialogDescription>
              A source is where this evidence can be seen or checked. Attaching one marks it as Supported.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="source-type" className="dossier-eyebrow">
                Source type
              </label>
              <Select
                value={sourceType}
                onValueChange={(value) => {
                  setSourceType(value as EvidenceSourceType);
                  setSourceMessage(null);
                }}
              >
                <SelectTrigger id="source-type" aria-label="Source type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVIDENCE_SOURCE_TYPES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {SOURCE_TYPE_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {sourceType === 'resume_entry' && (
              <div className="space-y-1.5">
                <label htmlFor="source-resume" className="dossier-eyebrow">
                  CV
                </label>
                <Select value={sourceResumeId} onValueChange={setSourceResumeId}>
                  <SelectTrigger id="source-resume" aria-label="CV for the source">
                    <SelectValue placeholder="Choose a CV" />
                  </SelectTrigger>
                  <SelectContent>
                    {resumes.map((resume) => (
                      <SelectItem key={resume.id} value={resume.id}>
                        {resume.title || 'Untitled CV'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {sourceType === 'interview_response' && (
              <div className="space-y-1.5">
                <label htmlFor="source-interview" className="dossier-eyebrow">
                  Interview practice
                </label>
                <Select value={sourceInterviewId} onValueChange={setSourceInterviewId}>
                  <SelectTrigger id="source-interview" aria-label="Interview practice for the source">
                    <SelectValue placeholder="Choose a session" />
                  </SelectTrigger>
                  <SelectContent>
                    {interviews.map((interview) => (
                      <SelectItem key={interview.id} value={interview.id}>
                        {interview.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(sourceType === 'resume_entry' || sourceType === 'interview_response') && (
              <div className="space-y-1.5">
                <label htmlFor="source-locator" className="dossier-eyebrow">
                  Entry locator (optional)
                </label>
                <Input
                  id="source-locator"
                  value={entryLocator}
                  onChange={(event) => setEntryLocator(event.target.value)}
                  maxLength={320}
                  placeholder="e.g. experience entry 2, first bullet"
                />
              </div>
            )}
            {sourceType === 'url' && (
              <div className="space-y-1.5">
                <label htmlFor="source-url" className="dossier-eyebrow">
                  HTTP(S) link
                </label>
                <Input
                  id="source-url"
                  type="url"
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  maxLength={2048}
                  placeholder="https://"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label htmlFor="source-label" className="dossier-eyebrow">
                Source label
              </label>
              <Input
                id="source-label"
                value={sourceLabel}
                onChange={(event) => setSourceLabel(event.target.value)}
                maxLength={160}
                placeholder="e.g. Debate society minutes, March"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="source-excerpt" className="dossier-eyebrow">
                Excerpt
              </label>
              <Textarea
                id="source-excerpt"
                value={sourceExcerpt}
                onChange={(event) => setSourceExcerpt(event.target.value)}
                maxLength={800}
                rows={3}
                placeholder="The short passage that supports this evidence."
              />
            </div>
            {sourceMessage && <p className="text-xs text-destructive">{sourceMessage}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSourceTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                sourceBusy ||
                !sourceLabel.trim() ||
                !sourceExcerpt.trim() ||
                (sourceType === 'url' && sourceUrl.trim().length === 0) ||
                (sourceType === 'resume_entry' && !sourceResumeId) ||
                (sourceType === 'interview_response' && !sourceInterviewId)
              }
              onClick={submitSource}
            >
              {sourceBusy && <Spinner className="size-4" />}
              Attach source
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
