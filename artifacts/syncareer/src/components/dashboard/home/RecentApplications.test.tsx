import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RecentApplications } from './RecentApplications';

describe('RecentApplications', () => {
  it('shows empty message when none', () => {
    render(
      <MemoryRouter>
        <RecentApplications items={[]} />
      </MemoryRouter>
    );
    expect(screen.getByText(/No applications yet/)).toBeTruthy();
  });

  it('renders list with status', () => {
    render(
      <MemoryRouter>
        <RecentApplications
          items={[
            {
              id: '1',
              status: 'pending',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              job: { title: 'Backend Engineer', company_name: 'BuildCo', location: 'Accra' },
            },
          ]}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('Backend Engineer')).toBeTruthy();
    // status badge text
    expect(screen.getByText('Applied')).toBeTruthy();
  });
});
