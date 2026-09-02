import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RecordList({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return <div role="list" aria-label={label} className={cn('divide-y divide-border border-y border-border', className)}>{children}</div>;
}

interface RecordRowProps {
  title: string;
  eyebrow?: string;
  detail?: string;
  meta?: ReactNode;
  status?: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function RecordRow({ title, eyebrow, detail, meta, status, selected, onClick, className }: RecordRowProps) {
  const content = (
    <>
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="dossier-eyebrow">{eyebrow}</p>}
        <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{title}</p>
        {detail && <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>}
        {meta && <div className="mt-2 text-xs text-muted-foreground">{meta}</div>}
      </div>
      {status}
      {onClick && <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />}
    </>
  );
  const classes = cn(
    'flex min-h-16 w-full items-center gap-3 border-l-2 px-3 py-3 text-left transition-colors duration-150 motion-reduce:transition-none sm:px-4',
    selected ? 'border-l-primary bg-secondary' : 'border-l-transparent',
    onClick && 'hover:border-l-primary/50 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
    className,
  );
  if (!onClick) return <div role="listitem" className={classes}>{content}</div>;
  return (
    <div role="listitem">
      <button type="button" aria-current={selected ? 'true' : undefined} onClick={onClick} className={classes}>{content}</button>
    </div>
  );
}
