import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DossierHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  metadata?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function DossierHeader({
  eyebrow,
  title,
  description,
  metadata,
  status,
  actions,
  className,
}: DossierHeaderProps) {
  return (
    <header className={cn('border-b border-border bg-card px-4 py-5 sm:px-6 sm:py-6', className)}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          <p className="dossier-eyebrow text-primary">{eyebrow}</p>
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="dossier-title w-full min-w-0 max-w-full break-words text-[26px] leading-8 text-foreground sm:w-auto sm:text-[32px] sm:leading-9">
              {title}
            </h1>
            {status}
          </div>
          {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
          {metadata && <div className="mt-3 text-xs text-muted-foreground">{metadata}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
