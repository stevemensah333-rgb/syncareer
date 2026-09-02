
import { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppSidebar, studentNavGroups } from './AppSidebar';

/**
 * Navigation shell tests: active-state detection, the collapse control, and
 * that every primary destination is reachable from the desktop rail.
 */

function renderSidebar(initialEntry = '/dashboard', withDossier = false) {
  function Harness() {
    const [collapsed, setCollapsed] = useState(false);
    return (
      <AppSidebar
        groups={studentNavGroups}
        isCollapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((p) => !p)}
        currentDossier={withDossier ? { id: 'app-1', title: 'Data Analyst', company: 'Cedar', statusLabel: 'In review' } : null}
      />
    );
  }
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Harness />
    </MemoryRouter>
  );
}

describe('AppSidebar (navigation)', () => {
  it('marks the current destination as active with aria-current', () => {
    renderSidebar('/opportunities');
    const home = screen.getByRole('link', { name: 'Home' });
    const opportunities = screen.getByRole('link', { name: 'Opportunities' });
    expect(opportunities.getAttribute('aria-current')).toBe('page');
    expect(opportunities.className).toContain('text-primary');
    expect(home.hasAttribute('aria-current')).toBe(false);
  });

  it('exposes the core student destinations', () => {
    renderSidebar();
    const links = screen.getAllByRole('link').map((l) => (l as HTMLAnchorElement).getAttribute('href'));
    expect(links).toEqual(['/dashboard', '/opportunities', '/applications', '/mentors']);
  });

  it('separates the current dossier from primary navigation', () => {
    renderSidebar('/dashboard', true);
    const dossier = screen.getByRole('link', { name: 'Current dossier: Data Analyst' });
    expect(dossier.getAttribute('href')).toBe('/applications?application=app-1');
    expect(screen.getByText('Cedar · In review')).toBeTruthy();
  });

  it('collapses and expands via the toggle, updating its accessible state', () => {
    renderSidebar();
    const toggle = screen.getByRole('button', { name: 'Collapse sidebar' });
    const aside = screen.getByRole('complementary');

    expect(aside.className).toContain('w-64');
    fireEvent.click(toggle);

    // Collapsed: narrower rail, toggle announces "expand".
    expect(aside.className).toContain('w-[68px]');
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Opportunities' }).getAttribute('title')).toBe('Opportunities');

    fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }));
    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeTruthy();
  });

  it('keeps navigation links keyboard-focusable with a visible focus treatment', () => {
    renderSidebar('/dashboard');
    const opportunities = screen.getByRole('link', { name: 'Opportunities' });
    opportunities.focus();
    expect(document.activeElement).toBe(opportunities);
    expect(opportunities.className).toContain('focus-visible:ring-2');
  });
});
