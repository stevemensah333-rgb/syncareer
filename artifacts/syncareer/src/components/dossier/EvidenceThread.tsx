import { ArrowRight, FileText, Mic2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EvidenceReference } from './EvidenceReference';
import { EvidenceStamp, type EvidenceSupportStatus } from './EvidenceStamp';

export interface EvidenceThreadItem {
  id: string;
  title: string;
  summary?: string;
  status: EvidenceSupportStatus;
  uses?: Array<'cv' | 'interview'>;
}

interface EvidenceThreadProps {
  requirement: string;
  detail?: string;
  evidence: EvidenceThreadItem[];
  selectedEvidenceId?: string;
  onSelectEvidence?: (id: string) => void;
  selected?: boolean;
  onSelectRequirement?: () => void;
  className?: string;
}

export function EvidenceThread({
  requirement,
  detail,
  evidence,
  selectedEvidenceId,
  onSelectEvidence,
  selected,
  onSelectRequirement,
  className,
}: EvidenceThreadProps) {
  const requirementHeader = (interactive: boolean) => (
    <div className="px-3 md:border-r md:border-border md:px-4">
      <p className="dossier-eyebrow">Requirement</p>
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
      <div className="space-y-4 px-3 md:px-4">
        {evidence.length === 0 ? (
          <div className="evidence-thread-track" data-state="missing">
            <div className="evidence-thread-node py-1">
              <p className="text-sm font-medium text-foreground">No supporting evidence yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Add a specific example or leave the gap visible.</p>
            </div>
          </div>
        ) : evidence.map((item) => {
          const selected = item.id === selectedEvidenceId;
          const body = (
            <div className="evidence-thread-node py-1">
              <div className="flex flex-wrap items-center gap-2">
                <EvidenceReference id={item.id} />
                <EvidenceStamp status={item.status} />
              </div>
              <p className="mt-2 text-sm font-semibold text-foreground">{item.title}</p>
              {item.summary && <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.summary}</p>}
              {item.uses && item.uses.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground">
                  <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                  {item.uses.map((use) => (
                    <span key={use} className="inline-flex items-center gap-1 border-b border-border pb-0.5">
                      {use === 'cv' ? <FileText aria-hidden="true" className="h-3.5 w-3.5" /> : <Mic2 aria-hidden="true" className="h-3.5 w-3.5" />}
                      {use === 'cv' ? 'Used in CV' : 'Used in interview practice'}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );

          const state = selected ? 'selected' : item.status;
          if (!onSelectEvidence) return <div key={item.id} className="evidence-thread-track" data-state={state}>{body}</div>;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelectEvidence(item.id)}
              className="evidence-thread-track block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              data-state={state}
            >
              {body}
            </button>
          );
        })}
      </div>
    </section>
  );
}
