import { cn } from '@/lib/utils';

interface EvidenceReferenceProps {
  id: string;
  className?: string;
}

export function evidenceReference(id: string): string {
  const normalized = id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `EV-${normalized.slice(0, 6).padEnd(6, '0')}`;
}

export function EvidenceReference({ id, className }: EvidenceReferenceProps) {
  return <span className={cn('evidence-reference font-mono', className)}>{evidenceReference(id)}</span>;
}
