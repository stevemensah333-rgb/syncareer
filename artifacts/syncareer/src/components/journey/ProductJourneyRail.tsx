import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export type ProductJourneyStepState = 'current' | 'available' | 'complete';

export interface ProductJourneyStep {
  id: string;
  label: string;
  description: string;
  to?: string;
  state: ProductJourneyStepState;
}

interface ProductJourneyRailProps {
  steps: ProductJourneyStep[];
  label?: string;
  className?: string;
}

function StepBody({ index, step }: { index: number; step: ProductJourneyStep }) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className={cn(
              'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center border text-[11px] font-semibold tabular-nums',
              step.state === 'current' && 'border-primary bg-primary text-primary-foreground',
              step.state === 'complete' && 'border-success bg-success/10 text-success',
              step.state === 'available' && 'border-border bg-secondary text-muted-foreground',
            )}
            style={{ borderRadius: 'var(--radius-control)' }}
          >
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="type-label text-primary">{step.label}</p>
            <p className="mt-1 text-sm font-semibold leading-5 text-foreground">{step.state === 'current' ? `${step.label} now` : step.description}</p>
            {step.state === 'current' && (
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.description}</p>
            )}
          </div>
        </div>
        <span
          className={cn(
            'type-label hidden sm:inline',
            step.state === 'current' && 'text-primary',
            step.state === 'complete' && 'text-success',
            step.state === 'available' && 'text-muted-foreground',
          )}
        >
          {step.state === 'current' ? 'Current' : step.state === 'complete' ? 'Ready' : 'Next'}
        </span>
      </div>
    </>
  );
}

export function ProductJourneyRail({ steps, label = 'Product journey', className }: ProductJourneyRailProps) {
  return (
    <nav aria-label={label} className={cn('surface-content overflow-hidden bg-card', className)}>
      <ol className="grid gap-0 md:grid-cols-3">
        {steps.map((step, index) => {
          const isCurrent = step.state === 'current';
          const sharedClassName = cn(
            'group relative flex min-h-[6.5rem] flex-col justify-between px-4 py-4 text-left transition-colors duration-150 ease-standard motion-reduce:transition-none sm:px-5',
            step.to && !isCurrent && 'interactive',
            isCurrent && 'bg-selected',
          );

          return (
            <li
              key={step.id}
              className={cn(
                'relative border-b border-border last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0',
                isCurrent && 'shadow-[inset_3px_0_0_0_hsl(var(--primary))] md:shadow-[inset_0_-3px_0_0_hsl(var(--primary))]',
              )}
            >
              {step.to && !isCurrent ? (
                <Link to={step.to} className={sharedClassName}>
                  <StepBody index={index} step={step} />
                </Link>
              ) : (
                <div className={sharedClassName} aria-current={isCurrent ? 'step' : undefined}>
                  <StepBody index={index} step={step} />
                </div>
              )}
              {index < steps.length - 1 && (
                <ArrowRight
                  aria-hidden="true"
                  className="absolute right-3 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-muted-foreground md:block"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
