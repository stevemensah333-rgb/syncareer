import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shared building blocks for the redesigned student journey (sign-up,
 * onboarding, mentor browsing, booking, dashboard).
 *
 * They are pure presentation: geometry, ink-on-white hierarchy and the
 * lavender information panel. Colour and radii come from the `.theme-pf`
 * token layer in index.css, never from local values.
 */

interface PfStepperProps {
  steps: string[];
  /** 1-based index of the step the user is on. */
  current: number;
  className?: string;
}

/** Horizontal progress rail: completed steps carry a tick, the active step is
 *  inked, upcoming steps stay quiet. */
export function PfStepper({ steps, current, className }: PfStepperProps) {
  return (
    <ol
      className={cn(
        'flex w-full flex-col gap-2 rounded-[1.25rem] border border-border bg-card p-2 sm:flex-row sm:items-stretch sm:gap-0',
        className,
      )}
      aria-label={`Step ${current} of ${steps.length}`}
    >
      {steps.map((label, index) => {
        const position = index + 1;
        const done = position < current;
        const active = position === current;
        return (
          <li
            key={label}
            aria-current={active ? 'step' : undefined}
            className={cn(
              'flex min-w-0 flex-1 items-center gap-3 rounded-[1rem] px-4 py-3',
              active && 'bg-secondary',
              index > 0 && 'sm:border-l sm:border-border sm:rounded-l-none',
            )}
          >
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-pill text-xs font-semibold',
                done && 'bg-secondary text-foreground',
                active && 'bg-foreground text-background',
                !done && !active && 'bg-muted text-muted-foreground',
              )}
            >
              {done ? <Check aria-hidden="true" className="size-3.5" /> : position}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">{label}</span>
              <span
                className={cn(
                  'eyebrow block',
                  active && 'text-[hsl(var(--pf-blue))]',
                )}
              >
                {done ? 'Complete' : active ? 'In progress' : 'Upcoming'}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

interface PfOptionProps {
  title: string;
  description?: string;
  selected: boolean;
  onSelect: () => void;
  /** Radio behaves single-select, checkbox multi-select. */
  control?: 'radio' | 'checkbox';
  /** Small right-hand label, e.g. "1–2 Yrs". */
  meta?: string;
  disabled?: boolean;
  className?: string;
}

/** A selectable row with its own control, title and supporting line. */
export function PfOption({
  title,
  description,
  selected,
  onSelect,
  control = 'radio',
  meta,
  disabled,
  className,
}: PfOptionProps) {
  return (
    <button
      type="button"
      role={control === 'radio' ? 'radio' : 'checkbox'}
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      data-selected={selected}
      className={cn('pf-option disabled:cursor-not-allowed disabled:opacity-60', className)}
    >
      <span className="flex items-start gap-3">
        <span
          className={cn(
            'mt-0.5 flex size-5 shrink-0 items-center justify-center border',
            control === 'radio' ? 'rounded-pill' : 'rounded-[6px]',
            selected ? 'border-foreground bg-foreground' : 'border-input bg-card',
          )}
          aria-hidden="true"
        >
          {selected && control === 'radio' && <span className="size-2 rounded-pill bg-background" />}
          {selected && control === 'checkbox' && <Check className="size-3.5 text-background" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-foreground">{title}</span>
            {meta && <span className="text-xs font-medium text-muted-foreground">{meta}</span>}
            {selected && !meta && (
              <span className="eyebrow rounded-pill bg-foreground px-2.5 py-0.5 text-background">
                Selected
              </span>
            )}
          </span>
          {description && (
            <span className="mt-1 block text-sm leading-6 text-muted-foreground">{description}</span>
          )}
        </span>
      </span>
    </button>
  );
}

interface PfChipProps {
  label: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

/** Pill toggle for fields, tracks and filters. */
export function PfChip({ label, selected, onSelect, disabled }: PfChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
      data-selected={selected}
      className="pf-chip disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span aria-hidden="true" className="text-base leading-none">
        {selected ? '✓' : '+'}
      </span>
      {label}
    </button>
  );
}

/** Small status pill, e.g. "100% free" or "Onboarding complete". */
export function PfBadge({
  children,
  tone = 'blue',
}: {
  children: ReactNode;
  tone?: 'blue' | 'green' | 'ink';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-pill px-3.5 py-1.5 text-xs font-semibold',
        tone === 'ink' ? 'bg-foreground text-background' : 'bg-[hsl(var(--pf-panel))]',
      )}
      style={tone === 'blue' ? { color: 'hsl(var(--pf-blue))' } : tone === 'green' ? { color: 'hsl(var(--pf-green))' } : undefined}
    >
      {tone !== 'ink' && (
        <span
          aria-hidden="true"
          className="size-1.5 rounded-pill"
          style={{ backgroundColor: tone === 'green' ? 'hsl(var(--pf-green))' : 'hsl(var(--pf-blue))' }}
        />
      )}
      {children}
    </span>
  );
}

/** Lavender note panel used for pledges, reassurance and summaries. */
export function PfNote({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="pf-panel flex gap-3 p-5">
      {icon && (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[0.75rem] bg-card text-foreground">
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <div className="mt-1 text-sm leading-6 text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

/** Section heading inside a card, with an optional right-hand counter. */
export function PfSectionHeading({
  title,
  description,
  meta,
}: {
  title: string;
  description?: string;
  meta?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-2 border-b border-border pb-3">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {meta && (
        <span className="eyebrow rounded-[0.5rem] bg-[hsl(var(--pf-panel))] px-2.5 py-1 text-foreground">
          {meta}
        </span>
      )}
    </div>
  );
}
