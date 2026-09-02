import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface WorkingDocumentProps {
  children: ReactNode;
  label?: string;
  className?: string;
}

export function WorkingDocument({ children, label = 'Working document', className }: WorkingDocumentProps) {
  return (
    <article aria-label={label} className={cn('dossier-document min-w-0 overflow-hidden', className)}>
      {children}
    </article>
  );
}
