import React from 'react';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export default function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <main id="main-content" tabIndex={-1} className="app-canvas flex min-h-screen items-start justify-center overflow-x-hidden px-4 py-8 focus:outline-none sm:items-center sm:py-12">
      <div className="w-full max-w-md">
        <a href="/" className="mb-8 inline-flex items-center gap-2 rounded-md text-sm font-semibold text-foreground focus-visible:outline-none">
          <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">S</span>
          Syncareer
        </a>
        <header>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
          {subtitle}
          </p>
        </header>
        <div className="mt-6 rounded-xl border bg-card p-5 sm:p-7">{children}</div>
      </div>
    </main>
  );
}
