import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PrimaryFocusCard } from './PrimaryFocusCard';

vi.mock('@/features/application-tracker/constants', () => ({
  STATUS_COLORS: { pending: 'bg-warning/15', interview: 'bg-primary/20' },
  formatShortDate: () => 'Jan 1, 2025',
  getDaysAgo: () => '2 days ago',
}));

describe('PrimaryFocusCard', () => {
  it('renders application focus with status and CTA', () => {
    render(
      <MemoryRouter>
        <PrimaryFocusCard
          type="application"
          data={{
            id: 'app1',
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            job: {
              id: 'job1',
              title: 'Software Engineer',
              company_name: 'Acme',
              location: 'Accra',
              employment_type: 'full-time',
              application_deadline: null,
            },
          }}
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/Current application dossier/)).toBeTruthy();
    expect(screen.getByText('Software Engineer')).toBeTruthy();
    expect(screen.getByText('Acme')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Open dossier/ })).toBeTruthy();
  });

  it('renders saved focus with tailor CV action', () => {
    render(
      <MemoryRouter>
        <PrimaryFocusCard
          type="saved"
          data={{
            job_id: 'job2',
            created_at: new Date().toISOString(),
            job: {
              id: 'job2',
              title: 'Data Analyst',
              company_name: 'DataCo',
              location: 'Lagos',
              employment_type: 'full-time',
              application_deadline: null,
            },
          }}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('Data Analyst')).toBeTruthy();
    expect(screen.getByText(/Tailor CV/)).toBeTruthy();
  });

  it('returns null for none type', () => {
    const { container } = render(
      <MemoryRouter>
        <PrimaryFocusCard type="none" />
      </MemoryRouter>
    );
    expect(container.innerHTML).toBe('');
  });
});
