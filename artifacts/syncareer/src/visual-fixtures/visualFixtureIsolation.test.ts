import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const productionEntry = readFileSync(resolve(process.cwd(), 'src/main.tsx'), 'utf8');
const productionApp = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
const fixtureSource = readFileSync(resolve(process.cwd(), 'src/visual-fixtures/EvidenceDossierReview.tsx'), 'utf8');

describe('visual fixture isolation', () => {
  it('keeps the development fixture out of production entry points', () => {
    expect(productionEntry).not.toContain('visual-fixtures');
    expect(productionApp).not.toContain('visual-fixtures');
  });

  it('keeps forbidden decorative treatments out of the fixture', () => {
    expect(fixtureSource).not.toMatch(/gradient|backdrop-blur|glass|Sparkles|hover:scale/);
  });
});
