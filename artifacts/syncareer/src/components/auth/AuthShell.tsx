import React, { useEffect } from 'react';
import syncareerLogo from '@/assets/syncareer-logo.svg';
import { setMetaTags } from '@/lib/seo';
import { useNoIndex } from '@/hooks/useNoIndex';
import { PfBadge } from '@/components/pathfind/primitives';

interface AuthShellProps {
  title: string;
  subtitle: string;
  /** Small pill above the title, e.g. "100% free career support". */
  eyebrow?: string;
  /** Quiet supporting panel shown beside the form on desktop. */
  aside?: React.ReactNode;
  children: React.ReactNode;
}

/** Split account surface: the form owns the left column and reads as the only
 *  task on the page; the right column is a quiet lavender panel that carries
 *  reassurance. On phones the panel drops away entirely. */
export default function AuthShell({ title, subtitle, eyebrow, aside, children }: AuthShellProps) {
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
      className="theme-pf min-h-screen bg-background px-5 py-8 focus:outline-none sm:px-8 lg:px-12 lg:py-12"
    >
      <div className="mx-auto grid w-full max-w-[1400px] gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-14">
        <div className="mx-auto w-full max-w-2xl">
          <a
            href="/"
            className="mb-10 inline-flex items-center gap-2 rounded-pill text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <img src={syncareerLogo} alt="" className="h-8 w-8 object-contain" />
            Syncareer
          </a>

          <header>
            {eyebrow && <PfBadge>{eyebrow}</PfBadge>}
            <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-[-0.035em] text-foreground sm:text-[44px]">
              {title}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">{subtitle}</p>
          </header>

          <div className="mt-8">{children}</div>
        </div>

        {aside && (
          <aside className="hidden lg:flex pf-panel flex-col items-center justify-center p-12 text-center">
            {aside}
          </aside>
        )}
      </div>
    </main>
  );
}
