import { Check, Circle, Dot } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import type { JourneyPhase, PhaseStatus } from '@/features/dashboard/discover';

const STATUS_META: Record<PhaseStatus, { label: string; Icon: typeof Check }> = {
  todo: { label: 'Not started', Icon: Circle },
  'in-progress': { label: 'In progress', Icon: Dot },
  active: { label: 'Active', Icon: Check },
};

/**
 * The Discover → Prove → Advance progression. It is a meaningful visualisation
 * of where the student stands in their real journey — not a score. Each phase
 * shows an honest state label derived from actual data; only Prove exposes a
 * numeric measure (CV completion) because that is the one true percentage we
 * hold. No invented readiness scores.
 */
export function CareerJourney({ phases }: { phases: JourneyPhase[] }) {
  return (
    <section aria-labelledby="career-journey-title" className="discover-enter" style={{ animationDelay: '60ms' }}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="career-journey-title" className="type-section-title">
          Your career journey
        </h2>
        <p className="type-meta">Discover → Prove → Advance</p>
      </div>

      <ol className="grid gap-3 sm:grid-cols-3">
        {phases.map((phase, index) => {
          const meta = STATUS_META[phase.status];
          return (
            <li key={phase.key}>
              <Link
                to={phase.href}
                className="discover-phase h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                data-current={phase.current || undefined}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={
                        phase.status === 'active'
                          ? 'flex size-6 items-center justify-center rounded-full border border-primary bg-primary text-primary-foreground'
                          : phase.status === 'in-progress'
                            ? 'flex size-6 items-center justify-center rounded-full border border-primary text-primary'
                            : 'flex size-6 items-center justify-center rounded-full border border-border text-muted-foreground'
                      }
                    >
                      <meta.Icon className="size-3.5" />
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      0{index + 1}
                    </span>
                  </span>
                  {phase.current && (
                    <span className="rounded-control bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-selected-foreground">
                      You are here
                    </span>
                  )}
                </div>

                <div className="mt-1">
                  <p className="text-sm font-semibold text-foreground">{phase.title}</p>
                  <p className="type-meta mt-0.5">{phase.summary}</p>
                </div>

                <div className="mt-auto pt-3">
                  {phase.progress !== null ? (
                    <div className="space-y-1.5">
                      <Progress
                        value={phase.progress}
                        className="h-1.5"
                        aria-label={`${phase.title} progress`}
                        aria-valuetext={`${phase.progress}%`}
                      />
                      <p className="type-meta">{phase.state}</p>
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-foreground-secondary">
                      <span className="sr-only">{meta.label}: </span>
                      {phase.state}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default CareerJourney;
