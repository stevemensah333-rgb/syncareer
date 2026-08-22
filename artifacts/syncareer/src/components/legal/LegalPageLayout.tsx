import { useLayoutEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, Printer } from 'lucide-react';
import syncareerLogo from '@/assets/syncareer-logo.svg';

export interface LegalSectionDefinition {
  id: string;
  title: string;
}

interface LegalPageLayoutProps {
  document: 'terms' | 'privacy';
  eyebrow: string;
  title: string;
  description: string;
  effectiveDate: string;
  sections: readonly LegalSectionDefinition[];
  children: ReactNode;
}

export function LegalPageLayout({ document: documentType, eyebrow, title, description, effectiveDate, sections, children }: LegalPageLayoutProps) {
  useLayoutEffect(() => {
    if (!window.location.hash) return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    window.document.getElementById(id)?.scrollIntoView({ block: 'start' });
    const timer = window.setTimeout(() => window.document.getElementById(id)?.scrollIntoView({ block: 'start' }), 500);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div id="legal-page-top" className="legal-page min-h-screen bg-background text-foreground">
      <a href="#legal-document" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-primary-foreground">Skip to legal document</a>
      <header className="legal-screen-only sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-[1240px] flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
          <Link to="/" className="flex min-h-11 items-center gap-2 rounded-md font-semibold" aria-label="Syncareer home"><img src={syncareerLogo} alt="" className="h-7 w-7" />Syncareer</Link>
          <nav aria-label="Legal documents" className="flex flex-wrap items-center gap-1 text-sm">
            <LegalNavLink to="/terms" active={documentType === 'terms'}>Terms</LegalNavLink>
            <LegalNavLink to="/privacy" active={documentType === 'privacy'}>Privacy</LegalNavLink>
            <a href="mailto:syncareer01@gmail.com" className="flex min-h-11 items-center rounded-md px-3 font-medium text-muted-foreground hover:bg-muted hover:text-foreground">Contact</a>
            <Link to="/" className="flex min-h-11 items-center rounded-md border px-3 font-medium">Back to Syncareer</Link>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <header className="border-b bg-secondary/45">
          <div className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
            <p className="text-xs font-semibold tracking-[0.14em] text-primary">{eyebrow}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{title}</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{description}</p>
            <p className="mt-5 text-sm font-medium">Effective date: {effectiveDate}</p>
          </div>
        </header>

        <div className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 lg:grid lg:grid-cols-[240px_minmax(0,720px)] lg:justify-center lg:gap-16 lg:px-8 lg:py-12">
          <aside className="legal-screen-only lg:sticky lg:top-24 lg:self-start">
            <details className="rounded-lg border bg-card lg:hidden">
              <summary className="flex min-h-12 cursor-pointer items-center px-4 font-semibold">Contents</summary>
              <LegalContents sections={sections} className="border-t px-3 py-2" />
            </details>
            <div className="hidden lg:block"><p className="mb-3 text-sm font-semibold">Contents</p><LegalContents sections={sections} /></div>
          </aside>

          <article id="legal-document" tabIndex={-1} aria-labelledby={`${documentType}-document-title`} className="legal-document mt-8 min-w-0 focus:outline-none lg:mt-0">
            <h2 id={`${documentType}-document-title`} className="sr-only">Complete {title}</h2>
            {children}
            <footer className="legal-screen-only mt-14 border-t pt-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <Link to={documentType === 'terms' ? '/privacy' : '/terms'} className="font-semibold text-primary underline underline-offset-4">{documentType === 'terms' ? 'Read the Privacy Policy' : 'Read the Terms and Conditions'}</Link>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm font-medium"><Printer className="h-4 w-4" aria-hidden="true" />Print</button>
                  <a href="#legal-page-top" className="inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm font-medium"><ArrowUp className="h-4 w-4" aria-hidden="true" />Back to top</a>
                </div>
              </div>
              <p className="mt-8 text-sm text-muted-foreground">Questions? <a href="mailto:syncareer01@gmail.com" className="font-medium text-primary underline underline-offset-4">Contact Syncareer</a>.</p>
            </footer>
          </article>
        </div>
      </main>
    </div>
  );
}

export function LegalSection({ id, title, number, children }: { id: string; title: string; number: number; children: ReactNode }) {
  return <section id={id} className="scroll-mt-24 border-t py-8 first:border-t-0 first:pt-0"><h2 className="text-xl font-semibold tracking-[-0.02em]"><a href={`#${id}`} aria-label={`Link to ${title}`} className="rounded-sm no-underline hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">{number}. {title}</a></h2><div className="mt-4 space-y-4">{children}</div></section>;
}

function LegalContents({ sections, className = '' }: { sections: readonly LegalSectionDefinition[]; className?: string }) {
  return <nav aria-label="Table of contents" className={className}><ol className="space-y-1">{sections.map((section, index) => <li key={section.id}><a href={`#${section.id}`} className="flex min-h-10 items-center rounded-md px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"><span className="mr-2 text-xs tabular-nums">{index + 1}.</span>{section.title}</a></li>)}</ol></nav>;
}

function LegalNavLink({ to, active, children }: { to: string; active: boolean; children: ReactNode }) {
  return <Link to={to} aria-current={active ? 'page' : undefined} className={`flex min-h-11 items-center rounded-md border-b-2 px-3 font-medium ${active ? 'border-primary bg-primary/5 text-foreground' : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'}`}>{children}</Link>;
}
