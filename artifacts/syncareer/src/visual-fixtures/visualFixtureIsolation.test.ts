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

  it('delivers the fixture\'s dossier story from the production route', () => {
    // The fixture is a review surface. The interaction story it demonstrates
    // must live on the real route, or the concept is trapped here.
    const page = readFileSync(resolve(process.cwd(), 'src/pages/ApplicationDossier.tsx'), 'utf8');
    const thread = readFileSync(resolve(process.cwd(), 'src/components/dossier/EvidenceThread.tsx'), 'utf8');
    const inspector = readFileSync(
      resolve(process.cwd(), 'src/components/applications/dossier/ApplicationEvidenceInspector.tsx'),
      'utf8',
    );

    expect(page).toContain('DossierFlowRail'); // the chain, stated once at the top
    expect(page).toContain('ApplicationEvidenceInspector'); // right-hand context panel
    expect(page).toContain('<Sheet'); // the same context as a mobile sheet
    expect(page).toContain('onFocusControl'); // a named next action moves focus to the real control

    for (const band of ['Job requirement', 'Your evidence', 'Application material', 'Next action']) {
      expect(thread, band).toContain(band);
    }
    // The inspector re-enters on every selection so the panel change is visible.
    expect(inspector).toContain('dossier-inspector-enter');
    for (const band of ['Job requirement', 'Your evidence', 'Application material', 'Next action']) {
      expect(inspector, band).toContain(band);
    }
  });
});
