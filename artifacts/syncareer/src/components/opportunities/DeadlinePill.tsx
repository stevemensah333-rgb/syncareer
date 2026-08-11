import { AlertCircle, CalendarClock, CalendarX2 } from 'lucide-react';
import { deadlineIsUrgent, type DeadlineState } from '@/features/opportunities/opportunity';
import { cn } from '@/lib/utils';

interface DeadlinePillProps {
  state: DeadlineState;
  /** 'row' is compact for list rows; 'detail' is slightly roomier. */
  variant?: 'row' | 'detail';
}

/**
 * Consistent deadline rendering, including the explicit expired state.
 * Never rendered for `kind: 'none'` — callers show "No deadline listed"
 * copy where that absence matters.
 */
export function DeadlinePill({ state, variant = 'row' }: DeadlinePillProps) {
  if (state.kind === 'none') return null;

  const base =
    variant === 'row'
      ? 'text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1'
      : 'text-sm px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1.5';
  const icon = variant === 'row' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  if (state.kind === 'passed') {
    return (
      <span className={cn(base, 'bg-destructive/10 text-destructive border border-destructive/30')}>
        <CalendarX2 className={icon} />
        {state.label}
      </span>
    );
  }

  if (deadlineIsUrgent(state)) {
    return (
      <span className={cn(base, 'bg-destructive/10 text-destructive')}>
        <AlertCircle className={icon} />
        {state.label}
      </span>
    );
  }

  return (
    <span className={cn(base, 'bg-muted text-muted-foreground')}>
      <CalendarClock className={icon} />
      {state.label}
    </span>
  );
}
