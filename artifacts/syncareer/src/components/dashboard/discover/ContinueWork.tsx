import { FileText, Mic, Compass, ArrowRight, Briefcase, Building2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import type { ActiveApplicationView, ContinueItem, ContinueKey } from '@/features/dashboard/discover';
import { statusLabel } from '@/features/application-tracker/workflow';
import { timeAgo } from '@/components/dashboard/home/utils';

const ICONS: Record<ContinueKey, typeof FileText> = {
  cv: FileText,
  applications: Briefcase,
  interview: Mic,
  assessment: Compass,
};

const ACTIVE_TONE: Record<string, string> = {
  interview: 'border-primary/40 bg-primary/5 text-primary',
  shortlisted: 'border-primary/40 bg-primary/5 text-primary',
  offered: 'border-success/40 bg-[hsl(var(--dossier-jade-wash))] text-success',
};

function statusTone(status: string): string {
  return ACTIVE_TONE[status] ?? 'border-border bg-muted text-muted-foreground';
}

interface ContinueWorkProps {
  /** Active applications as in-progress work objects. */
  applications: ActiveApplicationView[];
  totalTracked: number;
  /** CV, interview, assessment preparation objects. */
  items: ContinueItem[];
}

/**
 * Continue — actual in-progress work the student already started.
 * Surfaces applications, CV, interview practice, and assessment with
 * meaningful progress only where underlying data exists. The object tied
 * to the current next move receives next-action emphasis.
 */
export function ContinueWork({ applications, totalTracked, items }: ContinueWorkProps) {
  const navigate = useNavigate();
  const hasApplications = applications.length > 0;

  return (
    <section
      aria-labelledby="continue-title"
      className="discover-enter command-zone"
      style={{ animationDelay: '80ms' }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="continue-title" className="type-section-title">
            Continue
          </h2>
          <p className="type-meta mt-0.5">Work already in progress</p>
        </div>
        {totalTracked > 0 && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
            <Link to="/applications">
              All applications <ArrowRight aria-hidden="true" className="ml-1 size-3.5" />
            </Link>
          </Button>
        )}
      </div>

      {/* Applications — primary continue objects when they exist */}
      {hasApplications ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {applications.map((app) => (
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
                  <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
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
                  <p className="mt-1.5 text-[11px] font-semibold text-primary">Your next move is here</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="discover-object p-5">
          <p className="text-sm font-medium text-foreground">No applications in progress</p>
          <p className="type-secondary mt-1">
            When you apply to a role, it appears here so you can move it through to an outcome.
          </p>
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/opportunities')} className="gap-1.5">
              Find an opportunity <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* CV · Interview · Assessment — preparation objects */}
      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
        {items.map((item) => {
          const Icon = ICONS[item.key];
          return (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => navigate(item.href)}
                className="discover-object h-full w-full p-4 text-left"
                data-emphasis={item.emphasis || undefined}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={
                      item.emphasis
                        ? 'flex size-8 items-center justify-center rounded-control border border-primary/40 bg-primary/10 text-primary'
                        : 'flex size-8 items-center justify-center rounded-control border border-border bg-muted text-muted-foreground'
                    }
                  >
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="type-meta truncate">{item.state}</p>
                  </div>
                </div>

                {item.progress !== null && (
                  <div className="mt-3">
                    <Progress
                      value={item.progress}
                      className="h-1.5"
                      aria-label={`${item.title} completion`}
                      aria-valuetext={`${item.progress}%`}
                    />
                  </div>
                )}

                <p className="type-secondary mt-3 line-clamp-2">{item.detail}</p>

                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  {item.ctaLabel}
                  <ArrowRight aria-hidden="true" className="size-3.5" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default ContinueWork;
