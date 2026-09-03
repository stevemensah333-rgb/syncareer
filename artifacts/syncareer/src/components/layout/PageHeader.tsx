import React from 'react';

import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  /** `operational` (default) is the standard product page title. `document`
   *  opts into the dossier type treatment and is reserved for
   *  application/evidence surfaces — see the dossier rule in index.css. */
  variant?: 'document' | 'operational';
}

/** Page title block on the workspace canvas. Location context (breadcrumbs)
 *  lives in the fixed top bar; this header stays with the content it names.
 *  Empty titles render nothing so pages like Dashboard that own their
 *  greeting stay clean. */
export function PageHeader({
  title,
  description,
  actions,
  className,
  variant = 'operational',
}: PageHeaderProps) {
  if (!title) return null;
  return (
    <header className={cn('workspace-page-header', className)}>
      <div className="page-container pt-5 lg:pt-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className={cn(
              'text-xl text-foreground md:text-[22px]',
              variant === 'document'
                ? 'font-dossier font-semibold tracking-[-0.02em]'
                : 'font-sans font-semibold tracking-[-0.015em]',
            )}>
              {title}
            </h1>
            {description && (
              <p className="type-secondary mt-0.5 max-w-2xl">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
