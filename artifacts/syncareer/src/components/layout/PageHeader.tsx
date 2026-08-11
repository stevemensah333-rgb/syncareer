import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

/** Compact page header with an optional breadcrumb trail and action slot.
 *  Used by the authenticated shells to keep titles predictable and dense. */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  if (!title) return null;
  return (
    <header
      className={cn(
        'border-b border-border bg-card',
        className
      )}
    >
      <div className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-6 lg:px-8">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            {breadcrumbs.map((crumb, i) => {
              const isLast = i === breadcrumbs.length - 1;
              return (
                <React.Fragment key={`${crumb.label}-${i}`}>
                  {i > 0 && <ChevronRight aria-hidden="true" className="h-3 w-3 shrink-0 text-muted-foreground/60" />}
                  {crumb.to && !isLast ? (
                    <Link
                      to={crumb.to}
                      className="rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span aria-current={isLast ? 'page' : undefined} className={cn(isLast && 'font-medium text-foreground')}>
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-[-0.015em] text-foreground md:text-[22px]">
              {title}
            </h1>
            {description && (
              <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">
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
