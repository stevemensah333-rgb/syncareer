import { ExternalLink, FileText, Mic2, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SourceReferenceType = 'resume_entry' | 'interview_response' | 'url' | 'manual_note';

const sourceIcons = {
  resume_entry: FileText,
  interview_response: Mic2,
  url: ExternalLink,
  manual_note: StickyNote,
};

interface SourceReferenceProps {
  type: SourceReferenceType;
  label: string;
  detail?: string;
  href?: string;
  className?: string;
}

export function SourceReference({ type, label, detail, href, className }: SourceReferenceProps) {
  const Icon = sourceIcons[type];
  const content = (
    <>
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium text-foreground">{label}</span>
        {detail && <span className="block truncate text-[11px] text-muted-foreground">{detail}</span>}
      </span>
    </>
  );
  const classes = cn('flex min-h-11 items-center gap-2 border-l-2 border-border bg-muted/40 px-3 py-2', className);

  if (href) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={cn(classes, 'transition-colors duration-150 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}>{content}</a>;
  }
  return <div className={classes}>{content}</div>;
}
