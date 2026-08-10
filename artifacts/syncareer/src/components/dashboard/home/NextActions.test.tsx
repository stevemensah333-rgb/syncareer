import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NextActionsList } from './NextActions';

describe('NextActionsList', () => {
  it('renders accessible actions with visible CTAs', () => {
    render(
      <MemoryRouter>
        <NextActionsList
          actions={[
            {
              id: 'cv',
              title: 'Improve your CV',
              description: 'Your CV strength is 40%',
              href: '/cv-builder',
              icon: 'cv',
            },
            {
              id: 'interview',
              title: 'Practise an interview',
              description: 'Run a mock interview',
              href: '/interview-simulator',
              icon: 'interview',
            },
          ]}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('Improve your CV')).toBeTruthy();
    expect(screen.getByText('Practise an interview')).toBeTruthy();
    // Buttons must be keyboard reachable (rendered as button elements)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(2);
  });

  it('returns null when empty', () => {
    const { container } = render(
      <MemoryRouter>
        <NextActionsList actions={[]} />
      </MemoryRouter>
    );
    expect(container.innerHTML).toBe('');
  });
});
