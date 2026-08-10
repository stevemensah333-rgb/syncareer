import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OnboardingProgress } from './OnboardingProgress';

describe('OnboardingProgress', () => {
  it('shows only when incomplete and renders steps', () => {
    render(
      <MemoryRouter>
        <OnboardingProgress
          steps={[
            { id: '1', label: 'Complete profile', description: 'Add major', done: false, href: '/onboarding' },
            { id: '2', label: 'Take assessment', description: '10 min', done: true, href: '/assessment' },
          ]}
        />
      </MemoryRouter>
    );
    expect(screen.getByText(/Setup progress/)).toBeTruthy();
    expect(screen.getByText('Complete profile')).toBeTruthy();
  });

  it('returns null when all done', () => {
    const { container } = render(
      <MemoryRouter>
        <OnboardingProgress
          steps={[
            { id: '1', label: 'Profile', description: 'done', done: true, href: '/' },
            { id: '2', label: 'Assessment', description: 'done', done: true, href: '/' },
          ]}
        />
      </MemoryRouter>
    );
    expect(container.innerHTML).toBe('');
  });
});
