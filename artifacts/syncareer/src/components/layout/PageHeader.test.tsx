
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('renders nothing when no title is provided (dashboard owns its greeting)', () => {
    const { container } = render(<PageHeader title="" />);
    expect(container.querySelector('header')).toBeNull();
  });

  it('renders the title and description', () => {
    render(<PageHeader title="Opportunities" description="Browse ranked roles" />);
    expect(screen.getByRole('heading', { name: 'Opportunities', level: 1 })).toBeTruthy();
    expect(screen.getByText('Browse ranked roles')).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 }).className).toContain('font-dossier');
  });

  it('uses operational typography when requested', () => {
    render(<PageHeader title="Mentor requests" variant="operational" />);
    expect(screen.getByRole('heading', { name: 'Mentor requests' }).className).toContain('font-sans');
  });

  it('renders a breadcrumb trail with the current page marked', () => {
    render(
      <MemoryRouter initialEntries={['/cv-builder']}>
        <PageHeader
          title="CV Builder"
          breadcrumbs={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Build', to: '/build' },
            { label: 'CV Builder' },
          ]}
        />
      </MemoryRouter>
    );
    const home = screen.getByRole('link', { name: 'Home' });
    expect((home as HTMLAnchorElement).getAttribute('href')).toBe('/dashboard');
    const current = screen.getByText('CV Builder', { selector: 'span[aria-current="page"]' });
    expect(current.getAttribute('aria-current')).toBe('page');
    expect(home.className).toContain('focus-visible:ring-2');
  });
});
