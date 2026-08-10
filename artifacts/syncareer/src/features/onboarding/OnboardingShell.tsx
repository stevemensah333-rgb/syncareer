import React from 'react';

interface OnboardingShellProps {
  eyebrow: string;
  title: string;
  italicWord: string;
  subtitle: string;
  children: React.ReactNode;
}

export function OnboardingShell({
  eyebrow,
  title,
  italicWord,
  subtitle,
  children,
}: OnboardingShellProps) {
  const titleParts = title.split(italicWord);
  return (
    <div
      className="relative min-h-screen flex items-start sm:items-center justify-center px-4 py-12 overflow-hidden"
      style={{ backgroundColor: 'hsl(var(--landing-cream))' }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full blur-3xl"
        style={{ backgroundColor: 'hsl(var(--landing-amber) / 0.18)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 h-[32rem] w-[32rem] rounded-full blur-3xl"
        style={{ backgroundColor: 'hsl(var(--primary) / 0.07)' }}
      />
      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur px-3.5 py-1.5 text-[11px] font-medium text-foreground/70 shadow-sm ring-1 ring-black/[0.04] mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          {eyebrow}
        </span>
        <h1 className="font-serif text-4xl sm:text-5xl font-normal leading-[1.05] tracking-[-0.02em] text-foreground text-center">
          {titleParts[0]}
          <span className="italic text-primary">{italicWord}</span>
          {titleParts[1]}
        </h1>
        {subtitle && (
          <p className="mt-4 max-w-md text-center text-foreground/60 text-sm sm:text-base leading-relaxed">
            {subtitle}
          </p>
        )}
        <div className="mt-10 w-full">{children}</div>
      </div>
    </div>
  );
}
