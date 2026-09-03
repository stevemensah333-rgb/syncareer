import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

const globalStylesheet = read('src/index.css');

/**
 * The dossier is a product pattern, not the Syncareer brand identity.
 *
 * These tests lock in the consolidation: one global palette shared by every
 * surface, with dossier styling limited to document geometry and typography
 * on application/evidence workflows.
 */
describe('Syncareer design system scope', () => {
  it('keeps one global color system — the workspace shell does not re-theme it', () => {
    const shellRule = globalStylesheet
      .slice(globalStylesheet.indexOf('.workspace-shell,'))
      .slice(0, globalStylesheet.slice(globalStylesheet.indexOf('.workspace-shell,')).indexOf('}'));

    for (const token of ['--background:', '--primary:', '--foreground:', '--border:', '--radius:']) {
      expect(shellRule).not.toContain(token);
    }
  });

  it('defines the shared token layers exactly once', () => {
    for (const token of [
      '--radius-control',
      '--radius-input',
      '--radius-surface',
      '--radius-surface-lg',
      '--radius-overlay',
      '--radius-document',
      '--page-max-width',
      '--canvas',
      '--border-subtle',
      '--primary-hover',
      '--selected',
      '--motion-base',
      '--motion-panel',
    ]) {
      expect(globalStylesheet.split(token).length - 1).toBeGreaterThanOrEqual(1);
    }

    for (const primitive of ['.type-page-title', '.type-secondary', '.type-supporting', '.surface-content', '.surface-canvas', '.surface-elevated']) {
      expect(globalStylesheet).toContain(primitive);
    }
  });

  it('does not reintroduce glassmorphism or undefined marketing palettes', () => {
    expect(globalStylesheet).not.toContain('backdrop-blur-lg');
    expect(globalStylesheet).not.toContain('shadow-glass');
    expect(globalStylesheet).not.toMatch(/--landing-(cream|amber|ink)/);
  });

  it('keeps document typography off non-dossier product pages', () => {
    // Operational pages must not opt into the dossier title face.
    for (const page of [
      'src/pages/Dashboard.tsx',
      'src/pages/Markets.tsx',
      'src/pages/Assessment.tsx',
      'src/pages/Pricing.tsx',
      'src/features/onboarding/OnboardingShell.tsx',
      'src/components/auth/AuthShell.tsx',
    ]) {
      expect(read(page)).not.toContain('dossier-title');
    }
  });

  it('defaults the shared page header to operational typography', () => {
    expect(read('src/components/layout/PageHeader.tsx')).toContain("variant = 'operational'");
  });
});
