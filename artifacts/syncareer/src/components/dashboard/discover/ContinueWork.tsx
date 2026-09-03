import { FileText, Mic, Compass, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import type { ContinueItem, ContinueKey } from '@/features/dashboard/discover';

const ICONS: Record<ContinueKey, typeof FileText> = {
  cv: FileText,
  applications: FileText,
  interview: Mic,
  assessment: Compass,
};

/**
 * Purposeful workflow objects for the student's preparation work — CV,
 * interview practice, and assessment. Each object exposes its current state,
 * a real progress measure where one exists (CV completion), and one clear next
 * action. Nothing here shows a fabricated score.
 */
export function ContinueWork({ items }: { items: ContinueItem[] }) {
  const navigate = useNavigate();

  return (
    <section aria-labelledby="continue-title" className="discover-enter" style={{ animationDelay: '180ms' }}>
      <h2 id="continue-title" className="type-section-title mb-3">
        Continue your preparation
      </h2>
      <ul className="grid gap-3 sm:grid-cols-3">
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
                  <span className="flex size-8 items-center justify-center rounded-control border border-border bg-muted text-muted-foreground">
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
