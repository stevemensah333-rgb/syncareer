import React from 'react';
import syncareerLogo from '@/assets/syncareer-logo.svg';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export default function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <main id="main-content" tabIndex={-1} className="surface-canvas flex min-h-screen items-start justify-center overflow-x-hidden px-4 py-8 focus:outline-none sm:items-center sm:py-12">
      <div className="w-full max-w-md">
        <a href="/" className="mb-8 inline-flex items-center gap-2 rounded-md text-sm font-semibold text-foreground focus-visible:outline-none">
          <img src={syncareerLogo} alt="" className="h-8 w-8 object-contain" />
          Syncareer
        </a>
        <header>
          <p className="type-label text-primary">Syncareer account</p>
          <h1 className="type-page-title mt-2">{title}</h1>
          <p className="type-secondary mt-2">
          {subtitle}
          </p>
        </header>
        <div className="surface-content mt-6 p-5 sm:p-7">{children}</div>
      </div>
    </main>
  );
}
