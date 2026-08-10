// ── Application status display ────────────────────────────────────

export const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning/15 text-warning',
  reviewing: 'bg-primary/15 text-primary',
  shortlisted: 'bg-secondary/15 text-secondary',
  interview: 'bg-primary/20 text-primary',
  offered: 'bg-success/15 text-success',
  hired: 'bg-success text-success-foreground',
  rejected: 'bg-destructive/15 text-destructive',
  withdrawn: 'bg-muted text-muted-foreground',
};

// ── Status → outcome mapping for analytics ────────────────────────

export const STATUS_OUTCOME_MAP: Record<string, string> = {
  hired: 'success',
  offered: 'success',
  rejected: 'rejected',
  withdrawn: 'withdrawn',
};

// ── Date formatting (pure, no React) ──────────────────────────────

export function formatShortDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getDaysAgo(dateString: string): string {
  const days = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}
