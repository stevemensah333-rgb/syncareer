import { describe, expect, it } from 'vitest';
import { deriveSupportStatus, supportStatusPresentation } from './supportStatus';

describe('deriveSupportStatus', () => {
  it('draft stays draft regardless of sources', () => {
    expect(deriveSupportStatus('draft', 0)).toBe('draft');
    expect(deriveSupportStatus('draft', 2)).toBe('draft');
  });

  it('confirmed without a source needs one', () => {
    expect(deriveSupportStatus('confirmed', 0)).toBe('needs_source');
  });

  it('confirmed with a source is supported', () => {
    expect(deriveSupportStatus('confirmed', 1)).toBe('supported');
  });

  it('archived wins over everything', () => {
    expect(deriveSupportStatus('archived', 3)).toBe('archived');
  });
});

describe('supportStatusPresentation', () => {
  it('gives every state a visible label and description (no colour-only state)', () => {
    for (const status of ['draft', 'needs_source', 'supported', 'archived'] as const) {
      const presentation = supportStatusPresentation(status);
      expect(presentation.label.length).toBeGreaterThan(0);
      expect(presentation.description.length).toBeGreaterThan(0);
    }
  });

  it('never describes supported as externally verified', () => {
    const presentation = supportStatusPresentation('supported');
    expect(presentation.label).toBe('Supported');
    expect(presentation.description).toMatch(/you attached/i);
    expect(presentation.description.toLowerCase()).not.toContain('verified');
  });
});
