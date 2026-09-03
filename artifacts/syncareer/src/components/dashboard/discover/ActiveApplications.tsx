import { ArrowRight, ArrowUpRight, Building2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { ActiveApplicationView } from '@/features/dashboard/discover';
import { statusLabel } from '@/features/application-tracker/workflow';
import { timeAgo } from '@/components/dashboard/home/utils';

const ACTIVE_TONE: Record<string, string> = {
  interview: 'border-primary/40 bg-primary/5 text-primary',
  shortlisted: 'border-primary/40 bg-primary/5 text-primary',
  offered: 'border-success/40 bg-[hsl(var(--dossier-jade-wash))] text-success',
};

function statusTone(status: string): string {
  return ACTIVE_TONE[status] ?? 'border-border bg-muted text-muted-foreground';
}

interface ActiveApplicationsProps {
  items: ActiveApplicationView[];
  /** Total tracked applications (active + closed) for the "view all" affordance. */
  totalTracked: number;
}

/**
 * Active applications as career objects — each shows only what the student
 * needs to decide whether to act: the role, organisation, current stage, and
 * when it last moved. The object tied to the current next move is emphasised
 * with a non-colour cue so it is obvious without relying on hover.
 */
export function ActiveApplications({ items, totalTracked }: ActiveApplicationsProps) {
  const navigate = useNavigate();

  return (
    <section aria-labelledby="active-applications-title" className="discover-enter" style={{ animationDelay: '120ms' }}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="active-applications-title" className="type-section-title">
          Active applications
        </h2>
        {totalTracked > 0 && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
            <Link to="/applications">
              View all <ArrowRight aria-hidden="true" className="ml-1 size-3.5" />
            </Link>
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="discover-object p-5">
          <p className="text-sm font-medium text-foreground">No active applications yet</p>
          <p className="type-secondary mt-1">
            When you record that you have applied to a role, it will appear here so you can track it
            through to an outcome.
          </p>
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/opportunities')} className="gap-1.5">
              Find an opportunity <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((app) => (
            <li key={app.id}>
              <Link
                to={app.href}
                className="discover-object h-full p-4"
                data-emphasis={app.emphasis || undefined}
                aria-label={`${app.role}${app.company ? `, ${app.company}` : ''}, ${statusLabel(app.status)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`inline-flex items-center rounded-control border px-2 py-0.5 text-[11px] font-semibold ${statusTone(app.status)}`}
                  >
                    {app.statusLabel}
                  </span>
                  <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-foreground">{app.role}</p>
                {app.company && (
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                    <Building2 aria-hidden="true" className="size-3.5 shrink-0" />
                    {app.company}
                  </p>
                )}
                <p className="type-meta mt-3">Updated {timeAgo(app.updatedAt)}</p>
                {app.emphasis && (
                  <p className="mt-1 text-[11px] font-semibold text-primary">Your next move is here</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default ActiveApplications;
