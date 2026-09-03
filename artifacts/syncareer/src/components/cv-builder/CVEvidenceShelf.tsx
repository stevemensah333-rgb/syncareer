import { useMemo, useState } from 'react';
import { Link2, Loader2, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EvidenceReference, EvidenceStamp, RecordState } from '@/components/dossier';
import { deriveSupportStatus } from '@/features/evidence/supportStatus';
import type { EvidenceItemRow, EvidenceSourceRow, ResumeEvidenceLinkRow } from '@/features/evidence/types';
import type { CVData } from '@/features/cv-builder/types';

/**
 * Evidence shelf for the application CV editor: saved evidence on the left,
 * with explicit controls for recording which CV entry each piece informed.
 * Insertion is never drag-and-drop and never mutates CV text; it maintains
 * usage links (resume_evidence_links) alongside the CV content.
 */

export interface ShelfHandlers {
  onAttach: (input: { evidenceId: string; cvSection: ResumeEvidenceLinkRow['cv_section']; entryLocator: string }) => Promise<string | null>;
  onDetach: (input: { evidenceId: string; cvSection: ResumeEvidenceLinkRow['cv_section']; entryLocator: string }) => Promise<boolean>;
}

interface Props extends ShelfHandlers {
  items: EvidenceItemRow[];
  sources: EvidenceSourceRow[];
  resumeLinks: ResumeEvidenceLinkRow[];
  resumeId: string;
  cvData: CVData;
  busy: boolean;
}

interface ShelfEntry {
  section: ResumeEvidenceLinkRow['cv_section'];
  locator: string;
  label: string;
}

function cvEntries(cv: CVData): ShelfEntry[] {
  const entries: ShelfEntry[] = [];
  for (const item of cv.experience) {
    entries.push({
      section: 'experience',
      locator: `experience:${item.id}`,
      label: `Experience — ${[item.role, item.company].filter((part) => part.trim()).join(' · ') || 'untitled'}`,
    });
  }
  for (const item of cv.projects) {
    entries.push({
      section: 'projects',
      locator: `projects:${item.id}`,
      label: `Project — ${[item.projectName, item.organization].filter((part) => part.trim()).join(' · ') || 'untitled'}`,
    });
  }
  for (const item of cv.activities) {
    entries.push({
      section: 'activities',
      locator: `activities:${item.id}`,
      label: `Activity — ${[item.activity, item.organization].filter((part) => part.trim()).join(' · ') || 'untitled'}`,
    });
  }
  for (const item of cv.achievements) {
    entries.push({
      section: 'achievements',
      locator: `achievements:${item.id}`,
      label: `Achievement — ${item.title.trim() || 'untitled'}`,
    });
  }
  return entries;
}

export function CVEvidenceShelf({ items, sources, resumeLinks, resumeId, cvData, busy, onAttach, onDetach }: Props) {
  const [pickFor, setPickFor] = useState<string | null>(null);
  const [pickedEntry, setPickedEntry] = useState<string>('');
  const [rowBusy, setRowBusy] = useState(false);
  const [shelfMessage, setShelfMessage] = useState<string | null>(null);

  const entries = useMemo(() => cvEntries(cvData), [cvData]);
  const sourcesByEvidence = useMemo(() => {
    const map = new Map<string, EvidenceSourceRow[]>();
    for (const source of sources) {
      const existing = map.get(source.evidence_id);
      if (existing) existing.push(source);
      else map.set(source.evidence_id, [source]);
    }
    return map;
  }, [sources]);

  const linksByEvidence = useMemo(() => {
    const map = new Map<string, ResumeEvidenceLinkRow[]>();
    for (const link of resumeLinks) {
      if (link.resume_id !== resumeId) continue;
      const existing = map.get(link.evidence_id);
      if (existing) existing.push(link);
      else map.set(link.evidence_id, [link]);
    }
    return map;
  }, [resumeLinks, resumeId]);

  const submitAttach = async () => {
    if (!pickFor || !pickedEntry) return;
    const entry = entries.find((candidate) => candidate.locator === pickedEntry);
    if (!entry) return;
    setRowBusy(true);
    const failure = await onAttach({ evidenceId: pickFor, cvSection: entry.section, entryLocator: entry.locator });
    setRowBusy(false);
    if (failure) {
      setShelfMessage(failure);
      return;
    }
    setShelfMessage(null);
    setPickFor(null);
    setPickedEntry('');
  };

  return (
    <section aria-label="Evidence shelf" className="space-y-3 border border-border bg-card">
      <div className="border-b border-border px-3 py-3">
        <p className="dossier-eyebrow">Evidence shelf</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Attach saved evidence to the CV entries it supports. Attachments are recorded; your CV text is not changed.
        </p>
      </div>
      <div className="space-y-3 px-3 pb-3">
        {shelfMessage && (
          <RecordState tone="warning" title="That change did not save" description={shelfMessage} className="border" />
        )}
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No evidence saved yet. Create evidence from the application dossier, then attach it here.
          </p>
        ) : (
          items.map((item) => {
            const status = deriveSupportStatus(item.review_status, (sourcesByEvidence.get(item.id) ?? []).length);
            const usages = linksByEvidence.get(item.id) ?? [];
            const usagesWithLabels = usages
              .map((link) => ({ link, entry: entries.find((candidate) => candidate.locator === link.entry_locator) }))
              // Entries removed from the draft leave stale locators; show them
              // as plain locators rather than dropping the history.
              .map(({ link, entry }) => ({ link, label: entry?.label ?? link.entry_locator }));
            return (
              <div key={item.id} className="border border-border">
                <div className="space-y-1.5 px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <EvidenceReference id={item.id} />
                    <EvidenceStamp status={status} />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{item.summary}</p>
                </div>
                {usagesWithLabels.length > 0 && (
                  <ul className="space-y-1 border-t border-border px-3 py-2">
                    {usagesWithLabels.map(({ link, label }) => (
                      <li key={link.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="min-w-0 truncate text-muted-foreground">{label}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busy || rowBusy}
                          aria-label={`Remove usage ${label} from ${item.title}`}
                          onClick={() =>
                            void onDetach({
                              evidenceId: item.id,
                              cvSection: link.cv_section,
                              entryLocator: link.entry_locator,
                            })
                          }
                        >
                          <Unlink aria-hidden="true" className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                {pickFor === item.id ? (
                  <div className="space-y-2 border-t border-border px-3 py-2">
                    <Select value={pickedEntry} onValueChange={setPickedEntry}>
                      <SelectTrigger aria-label={`CV entry for ${item.title}`}>
                        <SelectValue placeholder="Choose a CV entry" />
                      </SelectTrigger>
                      <SelectContent>
                        {entries.map((entry) => (
                          <SelectItem key={entry.locator} value={entry.locator}>
                            {entry.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Button type="button" size="sm" disabled={rowBusy || !pickedEntry} onClick={submitAttach}>
                        {rowBusy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />}
                        <Link2 aria-hidden="true" className="h-4 w-4" />
                        Attach
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => { setPickFor(null); setPickedEntry(''); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-border px-3 py-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy || item.review_status === 'archived'}
                      onClick={() => { setPickFor(item.id); setPickedEntry(''); setShelfMessage(null); }}
                    >
                      <Link2 aria-hidden="true" className="h-4 w-4" />
                      Attach to CV entry
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
