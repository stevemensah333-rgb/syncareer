import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import HeroSection from './HeroSection';
import ProductStory from './ProductStory';
import FAQSection, { LANDING_FAQS } from './FAQSection';
import LandingHeader from './LandingHeader';
import LandingFooter from './LandingFooter';
import ProductDemo from './ProductDemo';

afterEach(() => cleanup());

describe('landing page content and navigation', () => {
  it('leads with tightened pain-oriented hero headline, demo interaction CTA, and embedded product demo', () => {
    const onGetStarted = vi.fn();
    const onAssessment = vi.fn();
    const { container } = render(<HeroSection onGetStarted={onGetStarted} onAssessment={onAssessment} />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(
      /stop guessing what an application is missing.*stronger, evidence-based application/i,
    );
    const exploreBtn = screen.getByRole('button', { name: /explore opportunities/i });
    const tryDemoBtn = screen.getByRole('button', { name: /try the interactive demo/i });
    const assessmentBtn = screen.getByRole('button', { name: /not sure what fits/i });

    expect(exploreBtn).toBeTruthy();
    expect(tryDemoBtn).toBeTruthy();
    expect(assessmentBtn).toBeTruthy();

    fireEvent.click(exploreBtn);
    expect(onGetStarted).toHaveBeenCalledOnce();
    expect(container.textContent).toMatch(/External listings retain their source labels/i);
    expect(container.textContent).toMatch(/One application, connected steps/i);
  });

  it('renders one coherent feature breakdown and its trust boundaries after features', () => {
    const { container } = render(<ProductStory />);
    const text = container.textContent ?? '';

    expect(text).toMatch(/The role stays connected from first look to next action/i);
    expect(text).toMatch(/Keep the source, role, and requirements in view/i);
    expect(text).toMatch(/Build evidence without filling gaps with fiction/i);
    expect(text).toMatch(/Record the next action, then the outcome/i);
    expect(text).toMatch(/We tell you what's real and what's a suggestion/i);
    expect(text).toMatch(/Independent verification, ATS success, or guaranteed outcome/i);
    expect(text).toMatch(/Not claimed/i);
    expect(text).toMatch(/Application stage and outcome/i);
    expect(text).toMatch(/User controlled/i);
    expect(text).toMatch(/Independent verification, ATS success, or guaranteed outcome/i);
  });

  it('supports arrow-key navigation through the illustrative journey', () => {
    render(<ProductDemo />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
    tabs[0]!.focus();
    fireEvent.keyDown(tabs[0]!, { key: 'ArrowRight' });
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel').textContent).toMatch(/SQL/i);
  });

  it('exposes every FAQ as a keyboard-operable accordion trigger without legal copy', () => {
    render(<FAQSection />);
    expect(LANDING_FAQS).toHaveLength(4);
    for (const faq of LANDING_FAQS) {
      const trigger = screen.getByRole('button', { name: faq.q });
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(faq.a.split('. ').length).toBeLessThanOrEqual(3);
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
