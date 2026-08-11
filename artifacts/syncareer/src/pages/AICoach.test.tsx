import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AICoach from './AICoach';

vi.mock('@/components/layout/PageLayout', () => ({ PageLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));

describe('legacy AI coach route', () => {
  it('preserves bookmarks as a transition page to contextual workflows', () => {
    render(<MemoryRouter><AICoach /></MemoryRouter>);
    expect(screen.getByText('SynAI has moved into your workspace')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open Opportunities' }).getAttribute('href')).toBe('/opportunities');
    expect(screen.getByRole('link', { name: 'Open Applications' }).getAttribute('href')).toBe('/applications');
  });
});
