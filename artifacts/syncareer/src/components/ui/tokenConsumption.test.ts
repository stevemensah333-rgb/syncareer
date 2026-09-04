import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (relativePath: string) => readFileSync(resolve(root, relativePath), 'utf8');

/** Every `.tsx` / `.ts` source file under `src`, excluding tests. */
function sources(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
        found.push(full.slice(root.length + 1).replace(/\\/g, '/'));
      }
    }
  };
  walk(resolve(root, 'src'));
  return found.sort();
}

const appSources = () => sources().filter((path) => !path.startsWith('src/components/ui/'));

describe('design tokens are consumed, not re-implemented', () => {
  it('routes generic busy indicators through the shared Spinner', () => {
    // A CSS border-ring spinner is a second implementation of the same state.
    // The only spinning affordances left outside `ui/spinner.tsx` are a
    // refresh icon (which means "refreshing", not "loading") and the shared
    // record-state tone icon — never a hand-rolled ring.
    for (const path of appSources()) {
      const source = read(path);
      if (!/animate-spin/.test(source)) continue;
      expect(source, path).not.toContain('border-t-transparent');
      expect(source, path).not.toContain('border-b-2 border-primary');
    }
    expect(read('src/components/ui/spinner.tsx')).toContain('motion-reduce:animate-none');
  });

  it('collapses every spinner under prefers-reduced-motion', () => {
    for (const path of appSources()) {
      const source = read(path);
      for (const line of source.split('\n')) {
        if (!line.includes('animate-spin')) continue;
        expect(line, `${path}: ${line.trim()}`).toContain('motion-reduce:animate-none');
      }
    }
  });

  it('keeps the busy indicator decorative so it never double-announces', () => {
    const spinner = read('src/components/ui/spinner.tsx');
    expect(spinner).toContain('aria-hidden="true"');
    // Callers opt in to the announcement when the spinner stands alone.
    expect(read('src/components/auth/RoleRoute.tsx')).toContain('role="status"');
    expect(read('src/components/auth/AdminRoute.tsx')).toContain('role="status"');
    // …and stay decorative when a visible label already says it.
    expect(read('src/components/LoadingFallback.tsx')).toContain('role="status"');
    expect(read('src/components/LoadingFallback.tsx')).toContain('<Spinner className="size-8 text-primary" />');
  });

  it('does not hand-roll uppercase micro-labels in the workspace', () => {
    // Uppercase is reserved for the document pattern, the public journey and
    // the monospace deadline/reference chip. Everything else uses `.eyebrow`
    // or `.type-label` so the label vocabulary stays small and sentence-cased.
    const allowed = new Set([
      'src/components/applications/dossier/DossierIndexNav.tsx',
      'src/components/dossier/EvidenceStamp.tsx',
      'src/components/cv-builder/CVPreview.tsx',
      'src/components/landing/HeroSection.tsx',
      'src/components/landing/LandingFooter.tsx',
      'src/components/opportunities/DeadlinePill.tsx',
      'src/components/layout/MessageScreen.tsx',
      'src/lib/validationSchemas.ts',
      'src/visual-fixtures/EvidenceDossierReview.tsx',
    ]);

    const offenders = appSources().filter(
      (path) => /uppercase/.test(read(path)) && !allowed.has(path),
    );
    expect(offenders).toEqual([]);
  });

  it('keeps status colour in the Badge system, not a page-local palette', () => {
    for (const path of sources()) {
      expect(read(path), path).not.toContain('STATUS_COLORS');
    }
    expect(read('src/features/application-tracker/constants.ts')).toContain('STATUS_BADGE_VARIANT');
  });

  it('uses one easing curve outside the shared primitives', () => {
    // `ease-out` is Tailwind's default keyword and a different curve from
    // `--ease-standard`.
    for (const path of appSources()) {
      expect(read(path), path).not.toContain('ease-out');
    }
  });

  it('keeps control transitions inside the 120–180ms scale', () => {
    const offScale = /duration-(?:75|100|200|300|500|700|1000)\b/;
    for (const path of appSources()) {
      expect(read(path), path).not.toMatch(offScale);
    }
  });

  it('sizes shared-primitive icons with the size-* scale', () => {
    for (const primitive of ['button.tsx', 'badge.tsx', 'alert.tsx', 'accordion.tsx', 'select.tsx']) {
      const source = read(`src/components/ui/${primitive}`);
      expect(source, primitive).toContain('size-');
      expect(source, primitive).not.toMatch(/\bh-4 w-4\b/);
    }
  });

  it('does not reintroduce pill geometry on controls', () => {
    for (const control of ['button.tsx', 'input.tsx', 'textarea.tsx', 'card.tsx', 'tabs.tsx']) {
      const source = read(`src/components/ui/${control}`);
      expect(source, control).not.toContain('rounded-full');
      expect(source, control).not.toMatch(/\brounded-(?:xl|2xl|3xl)\b/);
    }
  });

  it('keeps the semantic token surface complete and alias-free of values', () => {
    const stylesheet = read('src/index.css');
    for (const role of [
      '--canvas',
      '--surface',
      '--surface-secondary',
      '--surface-elevated',
      '--text',
      '--text-secondary',
      '--text-muted',
      '--border',
      '--border-subtle',
      '--brand',
      '--brand-hover',
      '--selected',
      '--success',
      '--warning',
      '--error',
      '--info',
    ]) {
      expect(stylesheet, role).toContain(`${role}:`);
    }
    // The brand names reference the palette; they cannot drift from it.
    expect(stylesheet).toContain('--brand: var(--primary)');
    expect(stylesheet).toContain('--brand-hover: var(--primary-hover)');
  });

  it('declares the shared state vocabulary once, for bespoke rows and tiles', () => {
    // Shared controls implement these natively; this is the same vocabulary
    // for bespoke clickable rows, cards and tiles that cannot use a primitive.
    const stylesheet = read('src/index.css');
    for (const state of [
      '.interactive',
      '.is-selected',
      '.is-pressed',
      '.is-disabled',
      '.is-loading',
      '.is-error',
      '.is-warning',
      '.is-success',
    ]) {
      expect(stylesheet, state).toContain(state);
    }
    expect(stylesheet).toContain('focus-visible:ring-2');
    expect(stylesheet).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
