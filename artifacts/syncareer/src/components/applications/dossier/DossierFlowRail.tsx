import { ArrowRight, CircleDot, FileText, Link2, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DossierSectionId, FlowStepId, FlowTone } from '@/features/application-dossier/requirementFlow';

/**
 * The relationship the whole dossier is organised around, stated once at the
 * top of the document:
 *
 *   job requirement → your evidence → application material → next action
 *
 * Each step carries the real count or record for its stage and, on wide
 * screens, jumps to the section that holds it. It is emphasis, not a second
 * source of truth: the numbers come from the same rows the sections render, and
 * the highlighted step follows the current selection.
 */

export interface DossierFlowStep {
  id: FlowStepId;
  label: string;
  /** Section the step opens on wide screens. */
  section: DossierSectionId;
  value: string;
  tone: FlowTone;
}

interface DossierFlowRailProps {
  steps: DossierFlowStep[];
  /** Step matching the current inspector selection or visible section. */
  emphasisStepId: FlowStepId | null;
  interactive: boolean;
  onSelectSection: (section: DossierSectionId) => void;
  className?: string;
}

const stepIcons: Record<FlowStepId, typeof Link2> = {
  requirement: ListChecks,
  evidence: CircleDot,
  material: FileText,
  action: Link2,
};

export function DossierFlowRail({
  steps,
  emphasisStepId,
  interactive,
  onSelectSection,
  className,
}: DossierFlowRailProps) {
  return (
    <nav
      aria-label="Application flow"
      className={cn('border-b border-border bg-card', interactive && 'hidden xl:block', className)}
    >
      <ol className="grid gap-0 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = stepIcons[step.id];
          const emphasized = step.id === emphasisStepId;
          const body = (
            <>
              <span className="dossier-eyebrow flex items-center gap-1.5 text-primary">
                <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                {step.label}
              </span>
              <span
                className={cn(
                  'mt-1 line-clamp-2 text-left text-[13px] font-semibold leading-5 text-foreground',
                  step.tone === 'success' && 'text-success',
                  step.tone === 'warning' && 'text-warning',
                )}
              >
                {step.value}
              </span>
            </>
          );

          return (
            <li
              key={step.id}
              className={cn(
                'relative border-b border-border last:border-b-0 sm:border-r sm:last:border-r-0 xl:border-b-0',
                'transition-colors duration-150 ease-standard motion-reduce:transition-none',
                emphasized && 'bg-selected text-selected-foreground',
              )}
            >
              {interactive ? (
                <button
                  type="button"
                  onClick={() => onSelectSection(step.section)}
                  aria-current={emphasized ? 'true' : undefined}
                  aria-label={`${step.label}: ${step.value}. Open the ${step.label.toLowerCase()} section.`}
                  className="flex min-h-[4.25rem] w-full flex-col items-start px-3 py-2.5 pr-8 text-left transition-colors duration-150 ease-standard hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none"
                >
                  {body}
                </button>
              ) : (
                <div className="flex min-h-[4.25rem] flex-col items-start px-3 py-2.5">{body}</div>
              )}
              {index < steps.length - 1 && (
                <ArrowRight
                  aria-hidden="true"
                  className="absolute right-2 top-1/2 hidden h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground xl:block"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
