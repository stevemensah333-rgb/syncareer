import React, { useEffect } from 'react';
import syncareerLogo from '@/assets/syncareer-logo.svg';
import { setMetaTags } from '@/lib/seo';
import { useNoIndex } from '@/hooks/useNoIndex';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export default function AuthShell({ title, subtitle, children }: AuthShellProps) {
  // Sign-in, sign-up and reset-password are account utility pages, not
  // indexable content. Titles are owned by DocumentTitleManager; here we only
  // supply a per-page description and the noindex directive.
  useNoIndex();
  useEffect(() => {
    setMetaTags({ description: subtitle });
  }, [subtitle]);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="surface-canvas relative flex min-h-screen items-start justify-center overflow-x-hidden px-4 py-10 focus:outline-none sm:items-center sm:py-12"
    >
      <div
        className="public-grid public-grid-fade pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md">
        <a href="/" className="mb-8 inline-flex items-center gap-2 rounded-control text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <img src={syncareerLogo} alt="" className="h-8 w-8 object-contain" />
          Syncareer
        </a>
        <header>
          <p className="brand-eyebrow">Syncareer account</p>
          <h1 className="type-page-title mt-3">{title}</h1>
          <p className="type-secondary mt-2">
          {subtitle}
          </p>
        </header>
        <div className="surface-content mt-6 p-5 shadow-card sm:p-7">{children}</div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          One workspace, from your first opportunity to the outcome you record.
        </p>
      </div>
    </main>
  );
}
