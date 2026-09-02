import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  ApplicationStageRail,
  DossierHeader,
  EvidenceReference,
  EvidenceStamp,
  EvidenceThread,
  RecordState,
  evidenceReference,
  type DossierStage,
} from '@/components/dossier';

const stages: DossierStage[] = [
  { id: 'applied', label: 'Applied', state: 'done' },
  { id: 'review', label: 'In review', state: 'current' },
  { id: 'interview', label: 'Interview', state: 'upcoming' },
];

describe('Evidence Dossier primitives', () => {
  it('renders the dossier title as the only level-one heading', () => {
    render(<DossierHeader eyebrow="Application dossier" title="Data Analyst" description="Example organisation" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Data Analyst' })).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByText('Application dossier').className).toContain('dossier-eyebrow');
  });

  it('keeps evidence references stable and strips unsafe display characters', () => {
    expect(evidenceReference('a1-3f_2c-99')).toBe('EV-A13F2C');
    expect(evidenceReference('xy')).toBe('EV-XY0000');
    render(<EvidenceReference id="a1-3f_2c-99" />);
    expect(screen.getByText('EV-A13F2C').className).toContain('font-mono');
  });

  it('always exposes proof state as text rather than color alone', () => {
    const { rerender } = render(<EvidenceStamp status="supported" />);
    expect(screen.getByText('Supported')).toBeTruthy();
    rerender(<EvidenceStamp status="needs_source" />);
    expect(screen.getByText('Needs source')).toBeTruthy();
  });

  it('supports roving keyboard navigation across application stages', () => {
    function Harness() {
      const [selected, setSelected] = useState('review');
      return <ApplicationStageRail stages={stages} selectedId={selected} onStageChange={setSelected} />;
    }
    render(<Harness />);
    const review = screen.getByRole('tab', { name: /In review/ });
    review.focus();
    fireEvent.keyDown(review, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: /Interview/ }).getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(screen.getByRole('tab', { name: /Interview/ }), { key: 'Home' });
    expect(screen.getByRole('tab', { name: /Applied/ }).getAttribute('aria-selected')).toBe('true');
  });

  it('keeps missing evidence explicit and selects supported evidence accessibly', () => {
    const onSelect = vi.fn();
    const { rerender } = render(<EvidenceThread requirement="AWS" evidence={[]} />);
    expect(screen.getByText('No supporting evidence yet')).toBeTruthy();

    rerender(
      <EvidenceThread
        requirement="SQL"
        evidence={[{ id: 'a13f2c99', title: 'Reporting dashboard', status: 'supported', uses: ['cv'] }]}
        selectedEvidenceId="a13f2c99"
        onSelectEvidence={onSelect}
      />,
    );
    const evidenceButton = screen.getByRole('button', { name: /Reporting dashboard/ });
    expect(evidenceButton.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(evidenceButton);
    expect(onSelect).toHaveBeenCalledWith('a13f2c99');
    expect(screen.getByText('Used in CV')).toBeTruthy();
  });

  it('announces local loading and error states', () => {
    const { rerender } = render(<RecordState tone="loading" title="Loading dossier" description="Your navigation remains available." />);
    expect(screen.getByRole('status').getAttribute('aria-busy')).toBe('true');
    rerender(<RecordState tone="error" title="Could not save" description="Your draft is still here." />);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Your draft is still here.')).toBeTruthy();
  });
});
