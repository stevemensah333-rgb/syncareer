import type { ReactNode } from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { useHoverCapability } from '@/hooks/useHoverCapability';
import { cn } from '@/lib/utils';

/**
 * One consistent card-preview pattern for progressive disclosure.
 *
 * Use this only where a hover/focus preview answers a likely question or
 * reduces navigation. It is a *preview* of structured secondary information,
 * not a tooltip (short explanation) and not a drawer/panel (complete workflow
 * and actions). Every fact shown here must also appear in the full detail
 * view reached by activating the trigger, so nothing is hover-only.
 *
 * Behaviour (applies to every preview that uses this shell):
 * - Attached only on hover-capable, fine-pointer devices. On touch/coarse
 *   pointers it renders the bare trigger, so tapping the row opens the full
 *   detail view instead of a simulated hover.
 * - Opens on intentional hover (openDelay) AND on keyboard focus, and
 *   dismisses on Escape, pointer-leave or blur.
 * - Read-only and non-focusable: focus never becomes trapped inside it.
 * - Collision-aware and width-capped so it stays inside the viewport.
 * - Motion is a short fade/elevation response within the 120–180ms rhythm;
 *   the global `prefers-reduced-motion` override collapses it for
 *   motion-sensitive users.
 */
export function ContextualPreview({
  children,
  content,
  side = 'right',
  align = 'start',
  className,
}: {
  /** Single focusable element that opens the preview on hover/focus. */
  children: ReactNode;
  /** The structured secondary information shown in the preview. */
  content: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  className?: string;
}) {
  const canHover = useHoverCapability();

  // No simulated hover on coarse/touch pointers — those users reach the full
  // detail view by activating the trigger.
  if (!canHover) return <>{children}</>;

  return (
    <HoverCard openDelay={250} closeDelay={120}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side={side}
        align={align}
        sideOffset={10}
        collisionPadding={16}
        className={cn('hidden w-80 max-w-[calc(100vw-2rem)] lg:block', className)}
      >
        {content}
      </HoverCardContent>
    </HoverCard>
  );
}

/** Vertical layout for preview body content. */
export function PreviewContent({ children }: { children: ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}

/** A labelled icon + text row in a preview. */
export function PreviewLine({
  icon,
  children,
  className,
}: {
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn('flex items-start gap-2 text-xs text-muted-foreground', className)}>
      <span className="mt-0.5 shrink-0 text-foreground/70">{icon}</span>
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/** A highlighted "next action" callout at the bottom of a preview. */
export function PreviewCallout({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-surface border border-border-subtle bg-selected px-3 py-2">
      <p className="type-label text-selected-foreground">{label}</p>
      <p className="text-xs text-foreground">{children}</p>
    </div>
  );
}
