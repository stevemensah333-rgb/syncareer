import type { ReactNode } from 'react';
import { AlertTriangle, Check, FileQuestion, LoaderCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RecordStateTone = 'loading' | 'empty' | 'success' | 'warning' | 'error';

const icons = {
  loading: LoaderCircle,
  empty: FileQuestion,
  success: Check,
  warning: AlertTriangle,
  error: XCircle,
};

interface RecordStateProps {
  tone: RecordStateTone;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function RecordState({ tone, title, description, action, className }: RecordStateProps) {
  const Icon = icons[tone];
  const role = tone === 'error' || tone === 'warning' ? 'alert' : tone === 'loading' ? 'status' : undefined;
  return (
    <div
      role={role}
      aria-busy={tone === 'loading' || undefined}
      className={cn(
        'flex flex-col gap-3 border-l-2 border-border bg-muted/40 px-4 py-4 sm:flex-row sm:items-start sm:justify-between',
        tone === 'success' && 'border-l-success bg-[hsl(var(--dossier-jade-wash))]',
        tone === 'warning' && 'border-l-warning bg-[hsl(var(--dossier-clay-wash))]',
        tone === 'error' && 'border-l-destructive bg-destructive/5',
        className,
      )}
    >
      <div className="flex min-w-0 gap-3">
        <Icon aria-hidden="true" className={cn('mt-0.5 h-4 w-4 shrink-0', tone === 'loading' && 'animate-spin motion-reduce:animate-none', tone === 'success' && 'text-success', tone === 'warning' && 'text-warning', tone === 'error' && 'text-destructive')} />
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
