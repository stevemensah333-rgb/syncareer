import { Archive, Check, CircleDashed, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export type EvidenceSupportStatus = 'draft' | 'needs_source' | 'supported' | 'archived';

const statusConfig: Record<EvidenceSupportStatus, { label: string; Icon: typeof Check; className: string }> = {
  draft: { label: 'Draft', Icon: CircleDashed, className: 'border-border bg-muted text-muted-foreground' },
  needs_source: { label: 'Needs source', Icon: TriangleAlert, className: 'border-warning/50 bg-[hsl(var(--dossier-clay-wash))] text-warning' },
  supported: { label: 'Supported', Icon: Check, className: 'border-success/50 bg-[hsl(var(--dossier-jade-wash))] text-success' },
  archived: { label: 'Archived', Icon: Archive, className: 'border-border bg-card text-muted-foreground' },
};

interface EvidenceStampProps {
  status: EvidenceSupportStatus;
  className?: string;
}

export function EvidenceStamp({ status, className }: EvidenceStampProps) {
  const { label, Icon, className: statusClassName } = statusConfig[status];
  return (
    <span className={cn('inline-flex min-h-7 items-center gap-1.5 border px-2 text-[11px] font-semibold uppercase tracking-[0.08em]', statusClassName, className)}>
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
