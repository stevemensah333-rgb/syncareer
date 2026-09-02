import { useRef } from 'react';
import { Check, Circle, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DossierStageState = 'done' | 'current' | 'upcoming' | 'unrecorded';

export interface DossierStage {
  id: string;
  label: string;
  state: DossierStageState;
}

interface ApplicationStageRailProps {
  stages: DossierStage[];
  selectedId?: string;
  onStageChange?: (id: string) => void;
  label?: string;
  className?: string;
}

export function ApplicationStageRail({
  stages,
  selectedId,
  onStageChange,
  label = 'Application stages',
  className,
}: ApplicationStageRailProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = Math.max(0, stages.findIndex((stage) => stage.id === selectedId));

  const select = (index: number) => {
    const stage = stages[index];
    if (!stage || !onStageChange) return;
    onStageChange(stage.id);
    requestAnimationFrame(() => refs.current[index]?.focus());
  };

  return (
    <div
      aria-label={label}
      className={cn('overflow-x-auto border-b border-border bg-card', className)}
      role={onStageChange ? 'tablist' : 'list'}
    >
      <div className="flex min-w-max px-2 sm:px-4">
        {stages.map((stage, index) => {
          const active = stage.id === selectedId;
          const Icon = stage.state === 'done' ? Check : stage.state === 'unrecorded' ? Minus : Circle;
          const content = (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  'flex h-5 w-5 items-center justify-center border bg-card',
                  stage.state === 'done' && 'border-success bg-success text-success-foreground',
                  stage.state === 'current' && 'border-primary text-primary',
                  stage.state === 'upcoming' && 'border-border text-muted-foreground',
                  stage.state === 'unrecorded' && 'border-border text-muted-foreground',
                )}
              >
                <Icon className="h-3 w-3" />
              </span>
              <span>
                <span className="mr-1.5 font-mono text-[10px] text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
                {stage.label}
              </span>
              <span className="sr-only">, {stage.state}</span>
            </>
          );

          if (!onStageChange) {
            return <div key={stage.id} role="listitem" className="flex min-h-12 items-center gap-2 border-r border-border px-3 text-xs font-medium last:border-r-0">{content}</div>;
          }

          return (
            <button
              key={stage.id}
              ref={(node) => { refs.current[index] = node; }}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active || (selectedId === undefined && index === 0) ? 0 : -1}
              onClick={() => select(index)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                  event.preventDefault();
                  select((selectedIndex + 1) % stages.length);
                } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                  event.preventDefault();
                  select((selectedIndex - 1 + stages.length) % stages.length);
                } else if (event.key === 'Home') {
                  event.preventDefault();
                  select(0);
                } else if (event.key === 'End') {
                  event.preventDefault();
                  select(stages.length - 1);
                }
              }}
              className={cn(
                'relative flex min-h-12 items-center gap-2 border-r border-border px-3 text-left text-xs font-medium transition-colors duration-150 last:border-r-0 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none',
                active ? 'bg-secondary text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {content}
              {active && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
