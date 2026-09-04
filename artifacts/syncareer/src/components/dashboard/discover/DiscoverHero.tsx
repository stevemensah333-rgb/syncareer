import { ArrowRight, Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { NextMove } from '@/features/dashboard/discover';

const PHASE_LABEL: Record<NextMove['phase'], string> = {
  discover: 'Discover',
  prove: 'Prove',
  advance: 'Advance',
};

interface DiscoverHeroProps {
  greeting: string;
  firstName: string | null;
  /** Real career direction line (major / assessment interest), or null. */
  directionLine: string | null;
  nextMove: NextMove;
}

/**
 * Career command center hero. Answers one question immediately —
 * "What should I do next?" — with a single primary task, an honest reason,
 * and one CTA. Direction is shown only when real data supports it.
 */
export function DiscoverHero({ greeting, firstName, directionLine, nextMove }: DiscoverHeroProps) {
  const navigate = useNavigate();
  const heading = firstName ? `${greeting}, ${firstName}` : greeting;

  return (
    <section
      className="discover-hero discover-enter command-next-move"
      aria-labelledby="command-next-task"
    >
      <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(14rem,0.9fr)] lg:items-stretch lg:p-10">
        <div className="min-w-0 flex flex-col">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <p className="type-label text-foreground/70">{heading}</p>
            {directionLine && (
              <span className="inline-flex items-center gap-1.5 rounded-control border border-primary/20 bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary">
                <Compass aria-hidden="true" className="size-3.5" />
                <span className="truncate max-w-[16rem] sm:max-w-none">{directionLine}</span>
              </span>
            )}
          </div>

          <p className="mt-5 text-sm font-semibold tracking-tight text-primary">
            What should I do next?
          </p>

          <h1
            id="command-next-task"
            className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-[34px] sm:leading-[1.12]"
          >
            {nextMove.task}
          </h1>

          {nextMove.context && (
            <p className="mt-2 text-sm font-medium text-foreground-secondary">{nextMove.context}</p>
          )}

          <div className="mt-6 max-w-xl border-l-2 border-primary pl-4 command-why-reveal">
            <p className="type-label text-muted-foreground">Why it matters</p>
            <p className="mt-1 text-sm leading-6 text-foreground-secondary">{nextMove.why}</p>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              className="gap-2 command-cta shadow-sm"
              onClick={() => navigate(nextMove.href)}
            >
              {nextMove.ctaLabel}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
            <span className="type-meta hidden sm:inline">
              One focused step · {PHASE_LABEL[nextMove.phase]}
            </span>
          </div>
        </div>

        <aside
          className="hidden lg:flex flex-col justify-between rounded-surface border border-border/80 bg-card/80 p-5"
          aria-label="Current career phase"
        >
          <div>
            <p className="type-label">This step belongs to</p>
            <p className="mt-2 text-lg font-semibold tracking-tight text-foreground">
              {PHASE_LABEL[nextMove.phase]}
            </p>
            <p className="type-secondary mt-2">
              {nextMove.phase === 'discover' && 'Finding and choosing the right opportunities.'}
              {nextMove.phase === 'prove' && 'Building evidence and submitting applications.'}
              {nextMove.phase === 'advance' && 'Preparing for interviews and deciding outcomes.'}
            </p>
          </div>
          <PhaseSteps current={nextMove.phase} />
        </aside>
      </div>
    </section>
  );
}

function PhaseSteps({ current }: { current: NextMove['phase'] }) {
  const order: NextMove['phase'][] = ['discover', 'prove', 'advance'];
  return (
    <ol className="mt-6 flex flex-col gap-2" aria-hidden="true">
      {order.map((key) => {
        const isCurrent = key === current;
        return (
          <li
            key={key}
            className={
              isCurrent
                ? 'flex items-center gap-2 rounded-control border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-selected-foreground'
                : 'flex items-center gap-2 rounded-control px-2.5 py-1.5 text-xs font-medium text-muted-foreground'
            }
          >
            <span
              className={
                isCurrent
                  ? 'size-1.5 rounded-full bg-primary'
                  : 'size-1.5 rounded-full bg-border'
              }
            />
            {PHASE_LABEL[key]}
          </li>
        );
      })}
    </ol>
  );
}

export default DiscoverHero;
