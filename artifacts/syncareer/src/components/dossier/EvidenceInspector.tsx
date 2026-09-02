import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EvidenceInspectorProps {
  title: string;
  description?: string;
  children: ReactNode;
  onClose?: () => void;
  className?: string;
}

export function EvidenceInspector({ title, description, children, onClose, className }: EvidenceInspectorProps) {
  return (
    <aside aria-label="Evidence inspector" className={cn('border border-border bg-card', className)}>
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-4">
        <div>
          <p className="dossier-eyebrow">Evidence inspector</p>
          <h2 className="mt-1 text-sm font-semibold text-foreground">{title}</h2>
          {description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>}
        </div>
        {onClose && <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={onClose} aria-label="Close evidence inspector"><X /></Button>}
      </header>
      <div className="space-y-4 p-4">{children}</div>
    </aside>
  );
}
