import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import syncareerLogo from '@/assets/syncareer-logo.svg';

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
      className="surface-canvas relative min-h-screen overflow-x-hidden bg-background px-4 py-8 focus:outline-none sm:px-6 sm:py-12"
    >
      <div
        className="public-grid public-grid-fade pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
      <div className="relative mx-auto w-full max-w-2xl">
        <div className="mb-10 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-md text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Syncareer home"
          >
            <img src={syncareerLogo} alt="" className="h-8 w-8 object-contain" />
            Syncareer
          </Link>
          <span className="text-xs font-medium text-muted-foreground">Account setup</span>
        </div>

        <header className="mb-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="brand-eyebrow">{eyebrow}</p>
            {hasProgress && (
              <p className="text-xs font-medium text-muted-foreground">
                Step {currentStep} of {totalSteps}
              </p>
            )}
          </div>
          <h1 className="type-page-title mt-3">{title}</h1>
          {subtitle && (
            <p className="type-secondary mt-2 max-w-xl">
              {subtitle}
            </p>
          )}
          {hasProgress && (
            <div className="mt-6" aria-label={`Onboarding progress: step ${currentStep} of ${totalSteps}`}>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-pill bg-primary transition-[width] duration-150 ease-standard motion-reduce:transition-none"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2.5 flex items-center gap-2 text-xs text-muted-foreground">
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
