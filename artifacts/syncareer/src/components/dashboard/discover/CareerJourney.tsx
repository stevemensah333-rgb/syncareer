import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import type { JourneyPhase, PhaseStatus } from '@/features/dashboard/discover';

const STATUS_COPY: Record<PhaseStatus, string> = {
  todo: 'Not started',
  'in-progress': 'In progress',
  active: 'Underway',
};

/**
 * Career Signal — Discover → Prove → Advance.
 *
 * A visually distinctive progress region that explains where the student
 * stands using only real data. Not gamified: no badges, streaks, or overall
 * readiness score. Only Prove exposes a numeric measure (CV completion)
 * because that is the one true percentage we hold.
 */
export function CareerJourney({ phases }: { phases: JourneyPhase[] }) {
  return (
    <section
      aria-labelledby="career-signal-title"
      className="discover-enter career-signal"
      style={{ animationDelay: '200ms' }}
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 id="career-signal-title" className="type-section-title">
            Career signal
          </h2>
          <p className="type-meta mt-0.5">Where you stand across Discover, Prove, and Advance</p>
        </div>
        <p className="type-meta font-medium tracking-wide text-foreground-secondary">
          Discover · Prove · Advance
        </p>
      </div>

      <div className="career-signal-rail">
        <ol className="grid gap-0 sm:grid-cols-3">
          {phases.map((phase, index) => (
            <li key={phase.key} className="relative min-w-0">
              {index < phases.length - 1 && (
                <span
                  aria-hidden="true"
                  className="career-signal-connector hidden sm:block"
                />
              )}
              <Link
                to={phase.href}
                className="career-signal-phase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                data-current={phase.current || undefined}
                data-status={phase.status}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span
                      aria-hidden="true"
                      className="career-signal-node"
                      data-status={phase.status}
                      data-current={phase.current || undefined}
                    >
                      <span className="career-signal-node-inner" />
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </span>
                  {phase.current ? (
                    <span className="shrink-0 rounded-control bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                      Focus
                    </span>
                  ) : (
                    <span className="sr-only">{STATUS_COPY[phase.status]}</span>
                  )}
                </div>

                <div className="mt-3 min-w-0">
                  <p className="text-sm font-semibold tracking-tight text-foreground">{phase.title}</p>
                  <p className="type-meta mt-0.5 line-clamp-2">{phase.summary}</p>
                </div>

                <div className="mt-auto pt-4">
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
                    <p className="text-xs font-medium leading-5 text-foreground-secondary">
                      {phase.state}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default CareerJourney;
