import { Link } from 'react-router-dom';
import {
  Compass,
  FileText,
  Mic,
  ArrowRight,
  CheckCircle2,
  Users,
} from 'lucide-react';
import type { DiscoverSnapshot } from '@/features/dashboard/discover';

interface DashboardLowerContextProps {
  snapshot: DiscoverSnapshot;
}

/**
 * Lower useful context for the student home.
 * Natural resolution of the viewport: provides a quiet, intentional closing
 * surface summarizing career operating signals across Discover, Prove, and Advance,
 * plus clear next actions.
 */
export function DashboardLowerContext({ snapshot }: DashboardLowerContextProps) {
  const { major, school, assessmentDone, direction, applications, savedJobs, cvCompletion, interview } = snapshot;

  const directionSummary = major
    ? `${major}${school ? ` · ${school}` : ''}`
    : direction?.primary
    ? `${direction.primary} interest`
    : 'Not declared yet';

  const cvStatusText = cvCompletion >= 80
    ? 'Comprehensive'
    : cvCompletion >= 40
    ? `${cvCompletion}% complete`
    : 'Draft in progress';

  const interviewStatusText = interview.total > 0
    ? `${interview.total} session${interview.total === 1 ? '' : 's'} completed`
    : 'No practice sessions yet';

  return (
    <section
      aria-labelledby="dashboard-lower-context-title"
      className="discover-enter border-t border-border/70 pt-6"
      style={{ animationDelay: '240ms' }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="dashboard-lower-context-title" className="type-section-title text-foreground">
            Career Operating Signals
          </h2>
          <p className="type-meta mt-0.5 text-muted-foreground">
            Connected context from your profile, applications, and preparation
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* Discover Signal */}
        <div className="discover-object p-4">
          <div className="flex items-center gap-2">
            <Compass className="size-4 text-primary" aria-hidden="true" />
            <h3 className="type-label text-foreground">Discover</h3>
          </div>
          <p className="mt-2 text-xs font-medium text-foreground truncate" title={directionSummary}>
            {directionSummary}
          </p>
          <p className="type-meta mt-1 text-muted-foreground">
            {savedJobs.length} saved {savedJobs.length === 1 ? 'role' : 'roles'} · {assessmentDone ? 'Assessment completed' : 'Assessment pending'}
          </p>
          <div className="mt-3 pt-3 border-t border-border/50">
            <Link
              to="/opportunities"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Explore opportunities <ArrowRight className="size-3" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Prove Signal */}
        <div className="discover-object p-4">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-primary" aria-hidden="true" />
            <h3 className="type-label text-foreground">Prove</h3>
          </div>
          <p className="mt-2 text-xs font-medium text-foreground flex items-center gap-1.5">
            {cvCompletion >= 80 && <CheckCircle2 className="size-3.5 text-success shrink-0" aria-hidden="true" />}
            Primary CV: {cvStatusText}
          </p>
          <p className="type-meta mt-1 text-muted-foreground">
            {applications.length} tracked {applications.length === 1 ? 'application' : 'applications'}
          </p>
          <div className="mt-3 pt-3 border-t border-border/50">
            <Link
              to="/cv-builder"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Review primary CV <ArrowRight className="size-3" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Advance Signal */}
        <div className="discover-object p-4">
          <div className="flex items-center gap-2">
            <Mic className="size-4 text-primary" aria-hidden="true" />
            <h3 className="type-label text-foreground">Advance</h3>
          </div>
          <p className="mt-2 text-xs font-medium text-foreground">
            {interviewStatusText}
          </p>
          <p className="type-meta mt-1 text-muted-foreground">
            {interview.lastRole ? `Last: ${interview.lastRole}` : 'Voice simulation readiness'}
          </p>
          <div className="mt-3 pt-3 border-t border-border/50">
            <Link
              to="/interview-simulator"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Practise interview <ArrowRight className="size-3" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      {/* Helpful Closing Action Strip */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-surface border border-border/60 bg-card/60 p-3.5 sm:px-4">
        <p className="type-meta text-muted-foreground flex items-center gap-1.5">
          <Users className="size-3.5 text-muted-foreground" aria-hidden="true" />
          Need guidance on a role or CV?
        </p>
        <Link
          to="/mentors"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          Connect with a verified mentor <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

export default DashboardLowerContext;
