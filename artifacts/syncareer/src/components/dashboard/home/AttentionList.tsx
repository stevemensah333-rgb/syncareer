import { ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getActionDueLabel, getDaysUntilDeadline, getDeadlineLabel } from './utils';

export interface AttentionItem {
  id: string;
  title: string;
  company?: string | null;
  deadline: string;
  source: 'application' | 'saved';
  href: string;
  kind?: 'next-action' | 'deadline';
}

function AttentionRow({ item }: { item: AttentionItem }) {
  const days = getDaysUntilDeadline(item.deadline);
  const info = item.kind === 'next-action' ? getActionDueLabel(days) : getDeadlineLabel(days);
  if (!info) return null;
  return (
    <Link to={item.href} className="flex min-h-16 items-start justify-between gap-3 border-l-2 border-l-transparent px-4 py-3 transition-colors duration-150 hover:border-l-warning hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none">
      <div className="min-w-0">
        <p className="text-[13px] font-medium truncate text-foreground">{item.title}</p>
        <p className="text-[12px] text-muted-foreground truncate">
          {item.company ?? 'Role'} · {item.kind === 'next-action' ? 'Next action' : item.source === 'application' ? 'Applied' : 'Saved'}
        </p>
      </div>
      <span className="flex shrink-0 items-center gap-2">
        <span className={`inline-flex min-h-6 items-center border px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] ${info.tone === 'urgent' ? 'border-destructive/40 bg-destructive/5 text-destructive' : info.tone === 'soon' ? 'border-warning/40 bg-[hsl(var(--dossier-clay-wash))] text-warning' : 'border-border bg-muted text-muted-foreground'}`}>{info.label}</span>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
      </span>
    </Link>
  );
}

export function AttentionList({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="dossier-document" aria-labelledby="attention-title">
      <header className="border-b border-border px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="attention-title" className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="h-4 w-4 text-warning" />
            Needs attention
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{items.length} due</span>
        </div>
      </header>
      <div className="divide-y divide-border">
          {items.map(item => <AttentionRow key={item.id} item={item} />)}
      </div>
    </section>
  );
}
