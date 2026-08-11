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
    expect(actions[0]!.textContent).toMatch(/explore real opportunities/i);
    expect(actions[1]!.textContent).toMatch(/still choosing/i);
    fireEvent.click(actions[0]!);
    expect(onGetStarted).toHaveBeenCalledOnce();
    expect(container.textContent).toMatch(/Illustrative product state/i);
  });

  it('renders the complete workflow, workspace, CV, interview, guidance, and methodology story', () => {
    const { container } = render(<ProductStory />);
    const text = container.textContent ?? '';

    expect(text).toMatch(/Finding a role is not the same as building a case for it/i);
    expect(text).toMatch(/One thread from role discovery to your recorded result/i);
    expect(text).toMatch(/The role, your next action, and your record stay together/i);
    expect(text).toMatch(/Improve what is on the page—without inventing what is not/i);
    expect(text).toMatch(/Practise for this role/i);
    expect(text).toMatch(/Human guidance, when available/i);
    expect(text).toMatch(/Clear signals, visible limits/i);
    expect(text).toMatch(/not independently verified by Syncareer/i);
    expect(text).toMatch(/not a prediction or guarantee/i);
  });

  it('exposes every FAQ as a keyboard-operable accordion trigger', () => {
    render(<FAQSection />);
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
  });
});
