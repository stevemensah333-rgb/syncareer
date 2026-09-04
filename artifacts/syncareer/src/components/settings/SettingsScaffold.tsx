import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The shared scaffolding for every Settings destination.
 *
 * Settings is administrative infrastructure, so it keeps one quiet rhythm:
 * a section heading, then bordered groups whose rows are
 * "what this is" on the left and "its value or control" on the right. Sections
 * never hand-roll their own cards, radii or type scales.
 */

interface SettingsGroupProps {
  title: string;
  description?: string;
  /** One action at most (Edit, Add …). Destructive flows live in their own
   *  group so a page never buries a dangerous control among settings rows. */
  action?: ReactNode;
  tone?: 'default' | 'danger';
  children: ReactNode;
  className?: string;
}

export function SettingsGroup({
  title,
  description,
  action,
  tone = 'default',
  children,
  className,
}: SettingsGroupProps) {
  return (
    <section
      className={cn(
        'surface-content',
        tone === 'danger' && 'border-destructive/40',
        className,
      )}
      aria-label={title}
    >
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h3
            className={cn(
              'text-sm font-semibold tracking-[-0.01em]',
              tone === 'danger' ? 'text-destructive' : 'text-foreground',
            )}
          >
            {title}
          </h3>
          {description && <p className="type-supporting mt-0.5">{description}</p>}
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </header>
      <div>{children}</div>
    </section>
  );
}

interface SettingsRowProps {
  label: string;
  hint?: string;
  /** A control, a value, or a link. Rows without one are read-only facts. */
  children?: ReactNode;
  className?: string;
}

export function SettingsRow({ label, hint, children, className }: SettingsRowProps) {
  return (
    <div
      className={cn(
        'workspace-row flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6',
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="type-supporting mt-0.5">{hint}</p>}
      </div>
      {children && <div className="flex min-w-0 shrink-0 items-center gap-2 sm:justify-end">{children}</div>}
    </div>
  );
}

/** A saved value inside a row. Muted and right-aligned so it reads as data,
 *  not as a disabled input. */
export function SettingsValue({ children }: { children: ReactNode }) {
  return <p className="max-w-full truncate text-sm text-muted-foreground sm:text-right">{children}</p>;
}

interface SettingFieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

/** Label + control + optional inline error, for the edit affordances inside a
 *  group. One shape so every settings form reads the same. */
export function SettingField({ id, label, hint, error, children }: SettingFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="type-label">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** The inline editor a row opens into. Rendered under the rows it edits so the
 *  user never leaves the group they are working on. */
export function SettingsEditor({ children }: { children: ReactNode }) {
  return <div className="border-t border-border bg-secondary/40 px-4 py-4 sm:px-5">{children}</div>;
}
