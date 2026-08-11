import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { computeFullScore } from '@/features/cv-builder/scoring';
import { initialCVData } from '@/features/cv-builder/types';
import { CVStrengthScore } from './CVStrengthScore';

vi.mock('@/hooks/useFeedbackModal', () => ({
  useFeedbackModal: () => ({
    isOpen: false,
    triggerFeedback: vi.fn(),
    submitFeedback: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

describe('CVStrengthScore', () => {
  it('displays 0% completion for the untouched editor and explains every section', () => {
    render(<CVStrengthScore result={computeFullScore(initialCVData)} />);
    expect(screen.getByLabelText('0% complete')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'CV completion' }).getAttribute('aria-valuenow')).toBe('0');
    for (const label of ['Personal details', 'Education', 'Experience', 'Skills', 'Projects or achievements']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.getByText('Not assessed yet')).toBeTruthy();
    expect(screen.getByText(/not a prediction or guarantee/i)).toBeTruthy();
  });

  it('renders the documented contribution from meaningful fields', () => {
    const cv = {
      ...initialCVData,
      personal: { ...initialCVData.personal, firstName: 'Ama' },
    };
    render(<CVStrengthScore result={computeFullScore(cv)} />);
    expect(screen.getByLabelText('5% complete')).toBeTruthy();
    expect(screen.getByText('5/20')).toBeTruthy();
  });
});
