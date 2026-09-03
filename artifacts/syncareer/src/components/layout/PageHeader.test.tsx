import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    // Operational product typography is the default; the dossier/document
    // face is opt-in and reserved for application/evidence surfaces.
    expect(screen.getByRole('heading', { level: 1 }).className).toContain('font-sans');
    expect(screen.getByRole('heading', { level: 1 }).className).not.toContain('font-dossier');
  });

  it('uses document typography only when explicitly requested', () => {
    render(<PageHeader title="Application CV" variant="document" />);
    expect(screen.getByRole('heading', { name: 'Application CV' }).className).toContain('font-dossier');
  });
});
