import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DossierSectionProps {
  index?: string;
  label?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function DossierSection({ index, label, title, description, actions, children, className }: DossierSectionProps) {
  return (
    <section className={cn('dossier-section', className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {(index || label) && <p className="dossier-eyebrow">{[index, label].filter(Boolean).join(' / ')}</p>}
          <h2 className="dossier-title mt-1 text-xl leading-7 text-foreground">{title}</h2>
          {description && <p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
