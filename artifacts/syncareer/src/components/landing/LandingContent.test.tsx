import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import HeroSection from './HeroSection';
import ProductStory from './ProductStory';
import FAQSection, { LANDING_FAQS } from './FAQSection';
import LandingHeader from './LandingHeader';
import LandingFooter from './LandingFooter';

afterEach(() => cleanup());

describe('landing page content and navigation', () => {
  it('leads with one primary hero action and the opportunity-first promise', () => {
    const onGetStarted = vi.fn();
    const onAssessment = vi.fn();
    const { container } = render(<HeroSection onGetStarted={onGetStarted} onAssessment={onAssessment} />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(
      /real opportunity.*stronger, evidence-based application/i,
    );
    const actions = screen.getAllByRole('button');
    expect(actions).toHaveLength(2);
    expect(actions[0]!.textContent).toMatch(/explore opportunities/i);
    expect(actions[1]!.textContent).toMatch(/not sure what fits/i);
    fireEvent.click(actions[0]!);
    expect(onGetStarted).toHaveBeenCalledOnce();
    expect(container.textContent).toMatch(/Illustrative product state/i);
  });

  it('renders one coherent illustrative journey and its trust boundaries', () => {
    const { container } = render(<ProductStory />);
    const text = container.textContent ?? '';

    expect(text).toMatch(/One application, four connected steps/i);
    expect(text).toMatch(/Illustrative product state/i);
    expect(text).toMatch(/Graduate Data Analyst/i);
    expect(text).toMatch(/Find and save a real external role/i);
    expect(text).toMatch(/Build truthful evidence/i);
    expect(text).toMatch(/Prepare and track/i);
    expect(text).toMatch(/not independently verified by Syncareer/i);
    expect(text).toMatch(/do not guarantee applicant-tracking-system success/i);
    expect(screen.getAllByRole('tab')).toHaveLength(4);
  });

  it('supports arrow-key navigation through the illustrative journey', () => {
    render(<ProductStory />);
    const tabs = screen.getAllByRole('tab');
    tabs[0]!.focus();
    fireEvent.keyDown(tabs[0]!, { key: 'ArrowRight' });
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel').textContent).toMatch(/SQL/i);
  });

  it('exposes every FAQ as a keyboard-operable accordion trigger', () => {
    render(<FAQSection />);
    expect(LANDING_FAQS).toHaveLength(4);
    for (const faq of LANDING_FAQS) {
      const trigger = screen.getByRole('button', { name: faq.q });
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
    }
  });

  it('provides labelled desktop and mobile navigation without broken counsellor or pricing links', () => {
    render(
      <MemoryRouter>
        <LandingHeader onSignIn={vi.fn()} onSignUp={vi.fn()} />
        <LandingFooter />
      </MemoryRouter>,
    );

    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeTruthy();
    const menu = screen.getByRole('button', { name: 'Open navigation menu' });
    expect(menu.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(menu);
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /counsellors/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /pricing/i })).toBeNull();
    expect(screen.getAllByRole('link', { name: 'Product' }).length).toBeGreaterThan(0);
  });
});
