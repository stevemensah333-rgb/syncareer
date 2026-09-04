import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DossierFlowRail, type DossierFlowStep } from './DossierFlowRail';

const steps: DossierFlowStep[] = [
  { id: 'requirement', label: 'Job requirement', section: 'requirements', value: '1 of 3 supported', tone: 'warning' },
  { id: 'evidence', label: 'Your evidence', section: 'ledger', value: '2 of 4 ready', tone: 'warning' },
  { id: 'material', label: 'Application material', section: 'cv', value: 'Graduate Analyst CV', tone: 'success' },
  { id: 'action', label: 'Next action', section: 'progress', value: 'Send follow-up', tone: 'neutral' },
];

describe('DossierFlowRail', () => {
  it('states the relationship as four ordered steps, each carrying a real fact', () => {
    render(<DossierFlowRail steps={steps} emphasisStepId={null} interactive onSelectSection={vi.fn()} />);
    const rail = screen.getByRole('navigation', { name: 'Application flow' });
    expect(rail.textContent).toMatch(
      /Job requirement[\s\S]*Your evidence[\s\S]*Application material[\s\S]*Next action/,
    );
    expect(screen.getByText('1 of 3 supported')).toBeTruthy();
    expect(screen.getByText('Graduate Analyst CV')).toBeTruthy();
  });

  it('opens the section a step belongs to', () => {
    const onSelectSection = vi.fn();
    render(<DossierFlowRail steps={steps} emphasisStepId={null} interactive onSelectSection={onSelectSection} />);
    fireEvent.click(screen.getByRole('button', { name: /Application material: Graduate Analyst CV/ }));
    expect(onSelectSection).toHaveBeenCalledWith('cv');
  });

  it('marks only the step the current selection is about', () => {
    const { rerender } = render(
      <DossierFlowRail steps={steps} emphasisStepId="requirement" interactive onSelectSection={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: /Job requirement/ }).getAttribute('aria-current')).toBe('true');
    expect(screen.getByRole('button', { name: /Your evidence/ }).getAttribute('aria-current')).toBeNull();

    rerender(<DossierFlowRail steps={steps} emphasisStepId="evidence" interactive onSelectSection={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Job requirement/ }).getAttribute('aria-current')).toBeNull();
    expect(screen.getByRole('button', { name: /Your evidence/ }).getAttribute('aria-current')).toBe('true');
  });

  it('stays a status readout where the section tabs already navigate', () => {
    render(<DossierFlowRail steps={steps} emphasisStepId={null} interactive={false} onSelectSection={vi.fn()} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByText('2 of 4 ready')).toBeTruthy();
  });
});
