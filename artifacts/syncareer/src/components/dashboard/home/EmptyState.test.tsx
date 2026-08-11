import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('explains value and offers primary action without fake metrics', () => {
    render(
      <MemoryRouter>
        <EmptyState />
      </MemoryRouter>
    );
    expect(screen.getByText(/Start with a real opportunity/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Find an opportunity/ })).toBeTruthy();
    // Should NOT show fake metrics like XP, trophies etc.
    expect(screen.queryByText(/XP/)).toBeNull();
    expect(screen.queryByText(/Build & prepare/)).toBeNull();
    expect(screen.queryByRole('button', { name: /choosing a direction/i })).toBeNull();
  });

  it('offers assessment only when direction is explicitly unknown', () => {
    render(<MemoryRouter><EmptyState showAssessment /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /choosing a direction/i })).toBeTruthy();
  });
});
