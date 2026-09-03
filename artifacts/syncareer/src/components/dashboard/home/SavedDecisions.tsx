import { Link } from 'react-router-dom';
import { ArrowRight, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DashboardSavedJob } from '@/features/dashboard/continuation';
import { getDaysUntilDeadline, getDeadlineLabel } from './utils';

export function SavedDecisions({ items }: { items: DashboardSavedJob[] }) {
  const available = items.filter((item) => item.job).slice(0, 4);
  if (available.length === 0) return null;

  return (
    <section className="surface-content" aria-labelledby="saved-decisions-title">
      <header className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="saved-decisions-title" className="flex items-center gap-2 text-sm font-semibold"><Bookmark className="h-4 w-4 text-primary" />Saved opportunities to decide on</h2>
          <Button variant="ghost" size="sm" className="h-8 text-xs" asChild><Link to="/opportunities?view=saved">View saved <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button>
        </div>
      </header>
      <div className="divide-y divide-border">
          {available.map((item) => {
            const deadline = getDeadlineLabel(getDaysUntilDeadline(item.job?.application_deadline));
            return <Link key={item.job_id} to={`/opportunities?job=${encodeURIComponent(item.job_id)}`} className="flex min-h-16 items-center justify-between gap-3 border-l-2 border-l-transparent px-4 py-3 transition-colors duration-150 hover:border-l-primary hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none">
              <span className="min-w-0"><span className="block truncate text-sm font-medium">{item.job?.title}</span><span className="block truncate text-xs text-muted-foreground">{item.job?.company_name || 'Organisation not specified'} · Review, apply, or remove</span></span>
              <span className="flex shrink-0 items-center gap-2">{deadline && <span className={deadline.tone === 'urgent' ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>{deadline.label}</span>}<ArrowRight className="h-4 w-4 text-muted-foreground" /></span>
            </Link>;
          })}
      </div>
    </section>
  );
}
