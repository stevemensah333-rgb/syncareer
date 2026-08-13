import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AuthShell from './AuthShell';

describe('AuthShell', () => {
  it('uses the Syncareer logo in the home link instead of a letter placeholder', () => {
    render(<AuthShell title="Welcome back" subtitle="Sign in to continue."><div>Form</div></AuthShell>);

    const homeLink = screen.getByRole('link', { name: /syncareer/i });
    const logo = homeLink.querySelector('img');

    expect(logo).not.toBeNull();
    expect(logo?.getAttribute('src')).toMatch(/syncareer-logo\.svg$/);
    expect(homeLink.querySelector('[aria-hidden="true"]')).toBeNull();
  });
});
