import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';

interface OnboardingShellProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  currentStep?: number;
  totalSteps?: number;
  children: ReactNode;
}

export function OnboardingShell({
  eyebrow,
  title,
  subtitle,
  currentStep,
  totalSteps,
  children,
}: OnboardingShellProps) {
  const hasProgress = Boolean(currentStep && totalSteps);
  const progress = hasProgress ? Math.min(100, Math.round((currentStep! / totalSteps!) * 100)) : 0;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen bg-background px-4 py-6 text-foreground focus:outline-none sm:px-6 sm:py-10"
    >
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-md text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Syncareer home"
          >
            <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              S
            </span>
            Syncareer
          </Link>
          <span className="text-xs font-medium text-muted-foreground">Account setup</span>
        </div>

        <header className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</p>
            {hasProgress && (
              <p className="text-xs font-medium text-muted-foreground">
                Step {currentStep} of {totalSteps}
              </p>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && (
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              {subtitle}
            </p>
          )}
          {hasProgress && (
            <div className="mt-5" aria-label={`Onboarding progress: step ${currentStep} of ${totalSteps}`}>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-150 motion-reduce:transition-none"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                {currentStep === totalSteps ? (
                  <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                ) : null}
                <span>{currentStep === totalSteps ? 'Profile details' : 'Welcome'}</span>
              </div>
            </div>
          )}
        </header>

        {children}
      </div>
    </main>
  );
}
