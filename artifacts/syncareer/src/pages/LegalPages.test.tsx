import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import TermsAndConditions, { TERMS_SECTIONS } from './TermsAndConditions';
import PrivacyPolicy, { PRIVACY_SECTIONS } from './PrivacyPolicy';

afterEach(() => cleanup());

describe('legal document pages', () => {
  it('renders Terms in the shared semantic layout with stable navigation and metadata', () => {
    render(<MemoryRouter initialEntries={['/terms']}><TermsAndConditions /></MemoryRouter>);

    expect(screen.getByRole('heading', { level: 1, name: 'Terms and Conditions' })).toBeTruthy();
    expect(screen.getByText('Effective date: 1 February 2026')).toBeTruthy();
    expect(screen.getByRole('article')).toBeTruthy();
    expect(screen.getAllByRole('navigation', { name: 'Table of contents' }).length).toBe(2);
    expect(screen.getByRole('link', { name: 'Terms' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Read the Privacy Policy' }).getAttribute('href')).toBe('/privacy');
    expect(document.getElementById(TERMS_SECTIONS[5].id)).toBeTruthy();
    expect(screen.getByText(/Syncareer is free to use/)).toBeTruthy();
    expect(document.title).toBe('Terms and Conditions — Syncareer');
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://syncareer.me/terms');
  });

  it('renders Privacy without hiding its legal body or adding an unverified summary', () => {
    render(<MemoryRouter initialEntries={['/privacy']}><PrivacyPolicy /></MemoryRouter>);

    expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeTruthy();
    expect(screen.getByText('Effective date: 1 February 2026')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Privacy' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Read the Terms and Conditions' }).getAttribute('href')).toBe('/terms');
    expect(document.getElementById(PRIVACY_SECTIONS[10].id)).toBeTruthy();
    expect(screen.getByText(/Google Gemini, OpenAI GPT/)).toBeTruthy();
    expect(screen.queryByText(/provided for convenience/i)).toBeNull();
    expect(document.title).toBe('Privacy Policy — Syncareer');
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://syncareer.me/privacy');
  });

  it('provides keyboard-operable mobile contents and print control without marketing links', () => {
    const print = vi.fn();
    Object.defineProperty(window, 'print', { configurable: true, value: print });
    render(<MemoryRouter><TermsAndConditions /></MemoryRouter>);

    const contents = screen.getByText('Contents', { selector: 'summary' });
    fireEvent.click(contents);
    expect(contents.parentElement?.hasAttribute('open')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Print' }));
    expect(print).toHaveBeenCalledOnce();
    expect(screen.queryByRole('link', { name: /blog/i })).toBeNull();
    expect(screen.queryByText(/cover letter/i)).toBeNull();
    expect(screen.queryByRole('link', { name: /explore opportunities/i })).toBeNull();
  });
});
