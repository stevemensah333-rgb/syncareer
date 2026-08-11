import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AttentionList } from './AttentionList';

describe('AttentionList', () => {
  it('returns null when no items', () => {
    const { container } = render(
      <MemoryRouter>
        <AttentionList items={[]} />
      </MemoryRouter>
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders deadlines that need attention', () => {
    const future = new Date(Date.now() + 2 * 86400000).toISOString();
    render(
      <MemoryRouter>
        <AttentionList
          items={[
            {
              id: '1',
              title: 'Frontend Developer',
              company: 'TechCorp',
              deadline: future,
              source: 'application',
              href: '/applications',
            },
          ]}
        />
      </MemoryRouter>
    );
    expect(screen.getByText(/Needs attention/)).toBeTruthy();
    expect(screen.getByText('Frontend Developer')).toBeTruthy();
  });
});
