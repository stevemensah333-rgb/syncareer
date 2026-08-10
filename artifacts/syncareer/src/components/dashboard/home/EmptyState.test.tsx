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
    expect(screen.getByText(/Turn real opportunities into stronger applications/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Find an opportunity/ })).toBeTruthy();
    // Should NOT show fake metrics like XP, trophies etc.
    expect(screen.queryByText(/XP/)).toBeNull();
    // Three step path present
    expect(screen.getByText(/Save an opportunity/)).toBeTruthy();
    expect(screen.getByText(/Build & prepare/)).toBeTruthy();
    expect(screen.getByText(/Apply & track/)).toBeTruthy();
  });
});
