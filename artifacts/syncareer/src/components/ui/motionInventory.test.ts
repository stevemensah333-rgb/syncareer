import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

const css = read('src/index.css');
const tailwind = read('tailwind.config.ts');

/**
 * Motion inventory (cause and effect, not decoration).
 *
 * | Interaction | Trigger | Response | Duration | Easing | Purpose | Reduced motion |
 * | Control hover | pointer hover | color / border | 150ms | ease-standard | clickability | none |
 * | Control press | active | darker fill | 120–150ms | ease-standard | pressed | none |
 * | Focus-visible | keyboard | ring | instant | — | a11y | keep ring |
 * | Disabled | attr | opacity 50 | none | — | unavailable | keep |
 * | Loading | busy | pulse/spinner | looping | — | wait | pulse off |
 * | Sidebar | collapse | width | 150ms | ease-standard | continuity | none |
 * | Tabs | select | fill + panel fade | 150ms | ease-standard | selection | fade off |
 * | Drawer/sheet | open/close | slide + overlay fade | 150ms | ease-standard | overlay | fade only / none |
 * | Modal | open/close | overlay + content fade | 150ms | ease-standard | overlay | none |
 * | Route | layout mount | opacity | 150ms | ease-standard | continuity | none |
 * | Saving/saved | save state | color + flash | 180ms | ease-standard | feedback | color only |
 * | Requirement/evidence select | click/focus | left rule + tint | 150ms | ease-standard | selection | color only |
 * | Inspector change | selection key | 4px rise + fade | 150ms | ease-standard | context | none |
 * | Evidence attach | flash class | wash fade | 900ms | ease-out | confirmation | none |
 * | CV section | expand | grid-rows | 150ms | ease-standard | reveal | instant |
 * | Interview question | question id | opacity | 150ms | ease-standard | next item | none |
 * | Landing stage | tab | 8px slide + fade | 180ms | ease-standard | storytelling | none |
 * | Landing scroll | view timeline | 8px rise | view | linear | narrative | none |
 * | Discover object hover | fine pointer | 1px lift + border | 150ms | ease-standard | clickability | no lift |
 */
describe('motion inventory', () => {
  it('keeps the 120–180ms token set and standard easing', () => {
    expect(css).toMatch(/--motion-fast:\s*120ms/);
    expect(css).toMatch(/--motion-base:\s*150ms/);
    expect(css).toMatch(/--motion-slow:\s*180ms/);
    expect(css).toMatch(/--motion-panel:\s*200ms/);
    expect(css).toContain('--ease-standard: cubic-bezier(0.2, 0, 0, 1)');
    expect(tailwind).toContain(
      "'fade-in': 'fade-in var(--motion-base) var(--ease-standard)'",
    );
    expect(tailwind).toContain("standard: 'var(--ease-standard)'");
    expect(tailwind).not.toContain('zoom-in-95');
  });

  it('collapses non-essential motion under prefers-reduced-motion', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('animation-duration: 0.01ms !important');
    expect(css).toContain('.scroll-reveal { animation: none !important');
    expect(css).toContain('.route-enter');
    expect(css).toContain('.interview-question-enter');
    expect(css).toContain('.cv-section-body');
  });

  it('uses compositor-friendly scroll reveal of 8px, not a large translation', () => {
    expect(css).toContain('transform: translateY(8px)');
    expect(css).not.toContain('transform: translateY(24px)');
    expect(css).toContain('animation-timeline: view()');
  });

  it('does not lift discover objects on coarse pointers', () => {
    expect(css).toContain('@media (hover: hover) and (pointer: fine)');
    expect(css).toContain('transform: translateY(-1px)');
  });

  it('dialogs fade without scale and drawers do not scale the page', () => {
    expect(read('src/components/ui/dialog.tsx')).not.toContain('zoom-in-95');
    expect(read('src/components/ui/alert-dialog.tsx')).not.toContain('zoom-in-95');
    expect(read('src/components/ui/drawer.tsx')).toContain('shouldScaleBackground = false');
    expect(read('src/components/ui/drawer.tsx')).toContain('motion-reduce:animate-none');
    expect(read('src/components/ui/sheet.tsx')).toContain('duration-150');
  });

  it('accordion, switch, and tabs respect reduced motion', () => {
    expect(read('src/components/ui/accordion.tsx')).toContain('motion-reduce:animate-none');
    expect(read('src/components/ui/accordion.tsx')).toContain('duration-150');
    expect(read('src/components/ui/switch.tsx')).toContain('motion-reduce:transition-none');
    expect(read('src/components/ui/tabs.tsx')).toContain('motion-reduce:animate-none');
  });

  it('workspace routes enter with opacity, not layout shift', () => {
    expect(read('src/components/layout/AuthenticatedLayout.tsx')).toContain('route-enter');
    expect(css).toContain('.route-enter');
  });
});
