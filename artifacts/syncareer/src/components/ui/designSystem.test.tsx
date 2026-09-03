import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Button, IconButton, buttonVariants } from './button';

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

const stylesheet = read('src/index.css');
const tailwind = read('tailwind.config.ts');
const html = read('index.html');

describe('Syncareer design system foundation', () => {
  it('keeps a cool canvas rather than a pure-white page', () => {
    expect(stylesheet).toMatch(/--background:\s*216 33% 98%/);
    expect(stylesheet).toMatch(/--canvas:\s*216 33% 98%/);
    expect(stylesheet).not.toMatch(/--background:\s*0 0% 100%/);
    expect(stylesheet).not.toMatch(/--canvas:\s*0 0% 100%/);
  });

  it('exposes the required semantic colour tokens', () => {
    for (const token of [
      '--canvas',
      '--surface',
      '--surface-secondary',
      '--surface-elevated',
      '--text',
      '--text-secondary',
      '--text-muted',
      '--border',
      '--border-subtle',
      '--primary',
      '--primary-hover',
      '--selected',
      '--success',
      '--warning',
      '--error',
      '--info',
    ]) {
      expect(stylesheet).toContain(`${token}:`);
    }
  });

  it('defines control, surface, large-surface, and document radii', () => {
    expect(stylesheet).toContain('--radius-control:');
    expect(stylesheet).toContain('--radius-surface:');
    expect(stylesheet).toContain('--radius-surface-lg:');
    expect(stylesheet).toContain('--radius-document:');
    expect(stylesheet).toMatch(/--radius-pill:\s*9999px/);
  });

  it('defines layout primitives and three distinct mode hooks', () => {
    for (const primitive of [
      '.page-container',
      '.workspace-container',
      '.layout-section',
      '.layout-toolbar',
      '.layout-side-panel',
      '.layout-content-panel',
      '.layout-contextual-panel',
      '.mode-discover',
      '.mode-prove',
      '.mode-advance',
    ]) {
      expect(stylesheet).toContain(primitive);
    }

    const discover = stylesheet.slice(stylesheet.indexOf('.mode-discover'));
    const prove = stylesheet.slice(stylesheet.indexOf('.mode-prove'));
    expect(discover).toContain('--radius-surface-lg');
    expect(prove).toContain('--radius-document');
  });

  it('does not let mode hooks re-theme the global palette', () => {
    for (const mode of ['.mode-discover', '.mode-prove', '.mode-advance']) {
      const start = stylesheet.indexOf(mode);
      const block = stylesheet.slice(start, stylesheet.indexOf('}', start) + 1);
      expect(block).not.toContain('--primary:');
      expect(block).not.toContain('--background:');
      expect(block).not.toContain('--foreground:');
    }
  });

  it('keeps a short motion system and no decorative float', () => {
    expect(stylesheet).toContain('--motion-fast:');
    expect(stylesheet).toContain('--motion-base:');
    expect(stylesheet).toContain('--motion-panel:');
    expect(tailwind).toContain("'fade-in': 'fade-in 150ms ease-out'");
    expect(tailwind).not.toContain('pulse-gentle');
    expect(tailwind).not.toContain("'float'");
  });

  it('does not load the unused Instrument Serif face', () => {
    expect(html).not.toContain('Instrument Serif');
    expect(tailwind).not.toContain('Instrument Serif');
  });

  it('standardizes shared controls onto muted hover, not lavender accent', () => {
    const outline = buttonVariants({ variant: 'outline' });
    const ghost = buttonVariants({ variant: 'ghost' });
    expect(outline).toContain('hover:bg-muted');
    expect(outline).not.toContain('hover:bg-accent');
    expect(ghost).toContain('hover:bg-muted');
    expect(ghost).not.toContain('hover:bg-accent');
    expect(buttonVariants({ variant: 'default' })).toContain('hover:bg-primary-hover');

    expect(read('src/components/ui/select.tsx')).toContain('focus:bg-muted');
    expect(read('src/components/ui/select.tsx')).not.toContain('focus:bg-accent');
    expect(read('src/components/ui/dropdown-menu.tsx')).toContain('focus:bg-muted');
    expect(read('src/components/ui/dropdown-menu.tsx')).not.toContain('focus:bg-accent');
    expect(read('src/components/ui/dialog.tsx')).not.toContain('zoom-in-95');
    expect(read('src/components/ui/select.tsx')).not.toContain('zoom-in-95');
  });

  it('exports IconButton as the icon-sized button primitive', () => {
    render(<IconButton aria-label="Close" />);
    expect(screen.getByRole('button', { name: 'Close' }).className).toContain('w-10');
  });

  it('does not restyle existing routes onto mode wrappers', () => {
    for (const page of [
      'src/pages/Dashboard.tsx',
      'src/pages/Markets.tsx',
      'src/pages/Assessment.tsx',
      'src/pages/Pricing.tsx',
      'src/features/onboarding/OnboardingShell.tsx',
      'src/components/auth/AuthShell.tsx',
    ]) {
      const source = read(page);
      expect(source).not.toContain('mode-discover');
      expect(source).not.toContain('mode-prove');
      expect(source).not.toContain('mode-advance');
    }
  });

  it('keeps a default Button usable without IconButton', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });
});
