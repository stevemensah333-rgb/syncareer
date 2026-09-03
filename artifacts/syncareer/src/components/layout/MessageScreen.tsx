import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MessageScreenProps {
  /** Short status label shown above the title. Sentence case, not uppercase. */
  eyebrow?: ReactNode;
  title: string;
  description?: ReactNode;
  /** Primary and secondary actions, already rendered as links or buttons. */
  actions?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  role?: 'alert';
  className?: string;
  /** Rendered as <main> by default; error boundaries pass "div" because a
   *  <main> element may already exist further up the tree. */
  as?: 'main' | 'div';
}

/**
 * Shared full-page message surface for standalone outcomes: 404, signed out,
 * and unrecoverable errors.
 *
 * These three screens previously each carried their own marketing-flavoured
 * styling (cream/amber background tokens that were never defined, blurred
 * ornaments, serif italic headings, pill buttons). They now use the single
 * Syncareer canvas, type scale, and control geometry so a dead end still
 * clearly belongs to the product.
 */
export function MessageScreen({
  eyebrow,
  title,
  description,
  actions,
  footer,
  children,
  role,
  className,
  as = 'main',
}: MessageScreenProps) {
  const Element = as;
  return (
    <Element
      {...(as === 'main' ? { id: 'main-content', tabIndex: -1 } : {})}
      role={role}
      className={cn(
        'surface-canvas flex min-h-screen items-center justify-center px-4 py-12 focus:outline-none',
        className,
      )}
    >
      <div className="w-full max-w-md">
        {eyebrow && <p className="type-label text-primary">{eyebrow}</p>}
        <h1 className="type-page-title mt-2">{title}</h1>
        {description && <p className="type-secondary mt-3">{description}</p>}
        {actions && <div className="mt-8 flex flex-wrap items-center gap-3">{actions}</div>}
        {children}
        {footer && <div className="type-meta mt-6">{footer}</div>}
      </div>
    </Element>
  );
}
