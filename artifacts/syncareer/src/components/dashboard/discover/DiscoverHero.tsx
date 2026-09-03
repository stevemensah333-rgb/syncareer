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
 * The contextual hero. It answers one question — "what should I do next?" —
 * with a single primary action and a concise, honest reason. Everything shown
 * is derived from real data; when direction is unknown the line is simply
 * omitted rather than guessed.
 */
export function DiscoverHero({ greeting, firstName, directionLine, nextMove }: DiscoverHeroProps) {
  const navigate = useNavigate();
  const heading = firstName ? `${greeting}, ${firstName}` : greeting;

  return (
    <section
      className="discover-hero discover-enter"
      aria-labelledby="discover-hero-task"
    >
      <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.6fr_1fr] lg:items-center lg:p-10">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="type-label text-foreground/70">{heading}</p>
            {directionLine && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                <Compass aria-hidden="true" className="size-3.5" />
                {directionLine}
              </span>
            )}
          </div>

          <p className="eyebrow mt-5 text-primary">Your next move</p>
          <h1
            id="discover-hero-task"
            className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-[32px] sm:leading-[1.15]"
          >
            {nextMove.task}
          </h1>
          {nextMove.context && (
            <p className="mt-2 text-sm font-medium text-foreground-secondary">{nextMove.context}</p>
          )}

          <div className="mt-6 max-w-xl border-l-2 border-primary/40 pl-4">
            <p className="eyebrow text-muted-foreground">Why this matters</p>
            <p className="mt-1 text-sm leading-6 text-foreground-secondary">{nextMove.why}</p>
          </div>

          <div className="mt-6">
            <Button size="lg" className="gap-2" onClick={() => navigate(nextMove.href)}>
              {nextMove.ctaLabel}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </div>

        <div className="hidden lg:block" aria-hidden="true">
          <PhaseGlyph phase={nextMove.phase} />
        </div>
      </div>
    </section>
  );
}

/** A quiet, non-decorative phase marker so the hero visibly ties to the
 *  Discover → Prove → Advance model without adding chart noise. */
function PhaseGlyph({ phase }: { phase: NextMove['phase'] }) {
  const order: NextMove['phase'][] = ['discover', 'prove', 'advance'];
  return (
    <div className="ml-auto w-fit rounded-surface border border-border/70 bg-card/70 p-4">
      <p className="eyebrow text-muted-foreground">This step is</p>
      <div className="mt-3 flex items-center gap-2">
        {order.map((key, index) => (
          <div key={key} className="flex items-center gap-2">
            <span
              className={
                key === phase
                  ? 'rounded-control bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground'
                  : 'rounded-control bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground'
              }
            >
              {PHASE_LABEL[key]}
            </span>
            {index < order.length - 1 && <span className="h-px w-4 bg-border" />}
          </div>
        ))}
      </div>
    </div>
  );
}

export default DiscoverHero;
