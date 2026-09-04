// ── Application status display ────────────────────────────────────

import type { VariantProps } from 'class-variance-authority';

import type { badgeVariants } from '@/components/ui/badge';

type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];

/**
 * Application status → shared `Badge` variant.
 *
 * Status is rendered with the one badge primitive, so the semantic colour
 * lives in the badge system rather than in a parallel page-local palette.
 * `hired` is the only solid fill: it is the terminal achievement.
 */
export const STATUS_BADGE_VARIANT: Record<string, BadgeVariant> = {
  pending: 'soft-warning',
  reviewing: 'soft-primary',
  shortlisted: 'soft-neutral',
  interview: 'soft-primary',
  offered: 'soft-success',
  hired: 'success',
  rejected: 'soft-destructive',
  withdrawn: 'soft-neutral',
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
