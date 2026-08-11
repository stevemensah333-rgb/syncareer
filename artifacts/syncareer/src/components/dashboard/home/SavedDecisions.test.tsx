import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { SavedDecisions } from './SavedDecisions';

describe('SavedDecisions', () => {
  it('renders real saved data with stable opportunity links', () => {
    render(<MemoryRouter><SavedDecisions items={[{
      job_id: 'job-1', created_at: '2026-08-10T00:00:00Z',
      job: { id: 'job-1', title: 'Data Analyst', company_name: 'Example Co', application_deadline: null },
    }]} /></MemoryRouter>);
    expect(screen.getByText('Data Analyst')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Data Analyst/ }).getAttribute('href')).toBe('/opportunities?job=job-1');
    expect(screen.getByRole('link', { name: /View saved/ }).getAttribute('href')).toBe('/opportunities?view=saved');
  });

  it('does not render deleted saved postings as actionable objects', () => {
    const { container } = render(<MemoryRouter><SavedDecisions items={[{ job_id: 'missing', created_at: '2026-08-10T00:00:00Z', job: null }]} /></MemoryRouter>);
    expect(container.innerHTML).toBe('');
  });
});
