import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function DossierActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        // On mobile the fixed MobileBottomNav (h-[3.75rem]) occupies the viewport
        // bottom, so the bar must stick above it; at md+ the nav is hidden and the
        // bar returns to the scrollport bottom.
        'sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px))] z-20 flex min-h-16 flex-wrap items-center justify-end gap-2 border-t border-border bg-card px-4 py-2 md:bottom-0 sm:px-6',
        className,
      )}
    >
      {children}
    </div>
  );
}
