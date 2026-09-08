import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import syncareerLogo from '@/assets/syncareer-logo.svg';
import { PfBadge, PfStepper } from '@/components/pathfind/primitives';

interface OnboardingShellProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  currentStep?: number;
  totalSteps?: number;
  /** Named stages. When supplied the shell shows the stepped rail instead of
   *  a plain progress bar. */
  steps?: string[];
  children: ReactNode;
}

/** Account setup canvas: white, generous, one task in the middle of the page
 *  with a named stage rail above it. */
export function OnboardingShell({
  eyebrow,
  title,
  subtitle,
  currentStep,
  totalSteps,
  steps,
  children,
}: OnboardingShellProps) {
  const hasProgress = Boolean(currentStep && totalSteps);
  const progress = hasProgress ? Math.min(100, Math.round((currentStep! / totalSteps!) * 100)) : 0;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="theme-pf min-h-screen bg-background px-5 py-8 focus:outline-none sm:px-8 sm:py-12"
    >
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-10 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-pill text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Syncareer home"
          >
            <img src={syncareerLogo} alt="" className="h-8 w-8 object-contain" />
            Syncareer
          </Link>
          <PfBadge tone="green">Free · no paid tier</PfBadge>
        </div>

        <header className="mb-8">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-3 text-[34px] font-semibold leading-[1.1] tracking-[-0.035em] text-foreground sm:text-[40px]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-3 max-w-xl text-base leading-7 text-muted-foreground">{subtitle}</p>
          )}

          {steps && steps.length > 0 && currentStep ? (
            <PfStepper steps={steps} current={currentStep} className="mt-7" />
          ) : hasProgress ? (
            <div className="mt-7" aria-label={`Onboarding progress: step ${currentStep} of ${totalSteps}`}>
              <div className="h-1.5 overflow-hidden rounded-pill bg-secondary">
                <div
                  className="h-full rounded-pill bg-foreground transition-[width] duration-150 ease-standard motion-reduce:transition-none"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2.5 text-xs text-muted-foreground">
                Step {currentStep} of {totalSteps}
              </p>
            </div>
          ) : null}
        </header>

        {children}
      </div>
    </main>
  );
}
