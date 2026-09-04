import { ArrowLeft, Check, Circle, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export type IndexNavStageState = 'done' | 'current' | 'upcoming' | 'unrecorded';

export interface IndexNavStage {
  id: string;
  label: string;
  state: IndexNavStageState;
}

export interface IndexNavSection {
  id: string;
  label: string;
}

interface DossierIndexNavProps {
  applicationTitle: string;
  description?: string;
  statusLabel: string;
  stages: IndexNavStage[];
  sections: IndexNavSection[];
  activeSectionId: string;
  onSelectSection: (sectionId: string) => void;
  className?: string;
}

/**
 * Desktop application index for the dossier workspace.
 *
 * This is deliberately narrower and calmer than the center document: it keeps
 * the application identity, the active stage, and the sections a person can
 * jump to. It never re-implements business logic or mutation flows; those stay
 * in the center and the inspector.
 */
export function DossierIndexNav({
  applicationTitle,
  description,
  statusLabel,
  stages,
  sections,
  activeSectionId,
  onSelectSection,
  className,
}: DossierIndexNavProps) {
  const currentStage = stages.find((stage) => stage.state === 'current');

  return (
    <aside aria-label="Application index" className={cn('border border-border bg-card', className)}>
      <div className="border-b border-border px-3 py-3">
        <Link
          to="/applications"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          All applications
        </Link>
      </div>

      <div className="border-b border-border px-3 py-4">
        <p className="dossier-eyebrow">Application</p>
        {/* Not a heading: the document's own h1 carries the application title;
            an h2 here would precede it in DOM order and break heading order. */}
        <p className="dossier-title mt-1 break-words text-lg leading-6 text-foreground">{applicationTitle}</p>
        {description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>}
        <p className="mt-3 inline-flex min-h-7 items-center border px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground">
          {statusLabel}
        </p>
      </div>

      <nav className="px-2 py-2" aria-label="Application sections">
        <p className="dossier-eyebrow px-2 pb-1 pt-1">In this application</p>
        <div className="space-y-1">
          {sections.map((section) => {
            const active = section.id === activeSectionId;
            return (
              <button
                key={section.id}
                type="button"
                aria-current={active ? 'true' : undefined}
                aria-pressed={active}
                onClick={() => onSelectSection(section.id)}
                className={cn(
                  'min-h-11 w-full px-3 text-left text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset motion-reduce:transition-none',
                  active ? 'bg-secondary text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <span className="block truncate">{section.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-border px-3 py-4">
        <p className="dossier-eyebrow">
          Stage
          {currentStage ? ` · ${currentStage.label}` : ''}
        </p>
        <ol aria-label="Application stages" className="mt-3 space-y-3">
          {stages.map((stage) => {
            const Icon = stage.state === 'done' ? Check : stage.state === 'unrecorded' ? Minus : Circle;
            const current = stage.state === 'current';
            return (
              <li
                key={stage.id}
                aria-current={current ? 'step' : undefined}
                className="flex min-h-6 items-center gap-2 text-xs text-muted-foreground"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center border bg-card',
                    stage.state === 'done' && 'border-success bg-success text-success-foreground',
                    stage.state === 'current' && 'border-primary text-primary',
                  )}
                >
                  <Icon className="h-3 w-3" />
                </span>
                <span className={cn('min-w-0 truncate', current ? 'font-semibold text-foreground' : '')}>
                  {stage.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}
