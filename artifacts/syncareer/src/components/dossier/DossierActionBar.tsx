import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function DossierActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('sticky bottom-0 z-20 flex min-h-16 flex-wrap items-center justify-end gap-2 border-t border-border bg-card px-4 py-2 sm:px-6', className)}>
      {children}
    </div>
  );
}
