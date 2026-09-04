import type { ReactNode } from 'react';
import { ArrowRight, FileText, Mic2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EvidenceReference } from './EvidenceReference';
import { EvidenceStamp, type EvidenceSupportStatus } from './EvidenceStamp';

export interface EvidenceThreadItem {
  id: string;
  title: string;
  summary?: string;
  /** Why this record answers this requirement, in the student's own words. */
  note?: string;
  status: EvidenceSupportStatus;
  uses?: Array<'cv' | 'interview'>;
  /** One-tick wash after this row was just attached; never a permanent state. */
  flash?: boolean;
}

interface EvidenceThreadProps {
  requirement: string;
  detail?: string;
  evidence: EvidenceThreadItem[];
  selectedEvidenceId?: string;
  onSelectEvidence?: (id: string) => void;
  selected?: boolean;
  onSelectRequirement?: () => void;
  /** "Application material" band: where this requirement's evidence appears. */
  material?: ReactNode;
  /** "Next action" band: the one concrete step this requirement needs. */
  nextAction?: ReactNode;
  /** Row-level maintenance controls, deliberately outside the flow bands. */
  editActions?: ReactNode;
  className?: string;
}

/**
 * One requirement and its evidence, read as the dossier's spine:
 *
 *   job requirement → your evidence → application material → next action
 *
 * Each band is labelled so the relationship survives a glance, a narrow
 * viewport, and a screen reader. Selecting the requirement or an evidence row
 * is what drives the inspector, so the highlight and the panel change are the
 * same event.
 */
export function EvidenceThread({
  requirement,
  detail,
  evidence,
  selectedEvidenceId,
  onSelectEvidence,
  selected,
  onSelectRequirement,
  material,
  nextAction,
  editActions,
  className,
}: EvidenceThreadProps) {
  const requirementHeader = (interactive: boolean) => (
    <div className="px-3 md:border-r md:border-border md:px-4">
      <p className="dossier-eyebrow">Job requirement</p>
      {interactive ? (
        <span className="mt-1 block text-sm font-semibold text-foreground">{requirement}</span>
      ) : (
        <h3 className="mt-1 text-sm font-semibold text-foreground">{requirement}</h3>
      )}
      {detail && <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>}
    </div>
  );

  return (
    <section
      className={cn(
        'grid gap-4 border-y border-l-2 py-4 transition-colors duration-150 motion-reduce:transition-none md:grid-cols-[minmax(150px,0.65fr)_minmax(0,1.35fr)]',
        selected ? 'border-l-primary bg-muted/30' : 'border-l-transparent',
        className,
      )}
      aria-label={`Evidence for ${requirement}`}
      data-selected={selected || undefined}
    >
      {onSelectRequirement ? (
        <button
          type="button"
          aria-current={selected ? 'true' : undefined}
          aria-pressed={selected}
          onClick={onSelectRequirement}
          className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          {requirementHeader(true)}
        </button>
      ) : (
        requirementHeader(false)
      )}
      <div className="space-y-3 px-3 md:px-4">
        <div className="space-y-3">
          <p className="dossier-eyebrow">Your evidence</p>
          {evidence.length === 0 ? (
            <div className="evidence-thread-track" data-state="missing">
              <div className="evidence-thread-node">
                <p className="text-sm font-medium text-foreground">No supporting evidence yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Add a specific example or leave the gap visible.</p>
              </div>
            </div>
          ) : (
            evidence.map((item) => {
              const isSelected = item.id === selectedEvidenceId;
              const body = (
                <div className="evidence-thread-node">
                  <div className="flex flex-wrap items-center gap-2">
                    <EvidenceReference id={item.id} />
                    <EvidenceStamp status={item.status} />
                  </div>
                  <p className="mt-2 text-sm font-semibold text-foreground">{item.title}</p>
                  {item.summary && <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.summary}</p>}
                  {item.note && <p className="mt-1 text-xs italic leading-5 text-muted-foreground">{item.note}</p>}
                  {item.uses && item.uses.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground">
                      <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                      {item.uses.map((use) => (
                        <span key={use} className="inline-flex items-center gap-1 border-b border-border pb-0.5">
                          {use === 'cv' ? (
                            <FileText aria-hidden="true" className="h-3.5 w-3.5" />
                          ) : (
                            <Mic2 aria-hidden="true" className="h-3.5 w-3.5" />
                          )}
                          {use === 'cv' ? 'Used in CV' : 'Used in interview practice'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );

              const state = isSelected ? 'selected' : item.status;
              const flash = item.flash ? ' dossier-flash' : '';
              if (!onSelectEvidence) {
                return (
                  <div key={item.id} className={`evidence-thread-track${flash}`} data-state={state}>
                    {body}
                  </div>
                );
              }
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelectEvidence(item.id)}
                  className={`evidence-thread-track block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2${flash}`}
                  data-state={state}
                >
                  {body}
                </button>
              );
            })
          )}
        </div>

        {material && (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="dossier-eyebrow">Application material</p>
            {material}
          </div>
        )}

        {nextAction && (
          <div className="space-y-2 border-y border-border bg-muted/25 px-3 py-3 md:px-4" data-flow-band="next-action">
            <p className="dossier-eyebrow">Next action</p>
            {nextAction}
          </div>
        )}

        {editActions && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3" data-flow-band="edits">
            {editActions}
          </div>
        )}
      </div>
    </section>
  );
}
