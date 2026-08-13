import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import HeroSection from "./HeroSection";
import ProductStory from "./ProductStory";
import FAQSection, { LANDING_FAQS } from "./FAQSection";
import LandingHeader from "./LandingHeader";
import LandingFooter from "./LandingFooter";
import ProductDemo from "./ProductDemo";
import FinalCTASection from "./FinalCTASection";

afterEach(() => cleanup());

describe("landing page content and navigation", () => {
  it("leads with the application benefit and one integrated application workspace", () => {
    const onGetStarted = vi.fn();
    const onAssessment = vi.fn();
    const { container } = render(<HeroSection onGetStarted={onGetStarted} onAssessment={onAssessment} />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/know what your application needs/i);
    const exploreButton = screen.getByRole("button", { name: /explore opportunities/i });
    const inspectButton = screen.getByRole("button", { name: /inspect how it works/i });
    const assessmentButton = screen.getByRole("button", { name: /not sure what fits/i });

    expect(exploreButton).toBeTruthy();
    expect(inspectButton).toBeTruthy();
    expect(assessmentButton).toBeTruthy();
    fireEvent.click(exploreButton);
    expect(onGetStarted).toHaveBeenCalledOnce();
    expect(container.textContent).toMatch(/Application \/ 0147/i);
    expect(container.textContent).toMatch(/Requirements and your evidence/i);
    expect(container.textContent).toMatch(/External opportunities keep their original source links\./i);

    const sqlEvidence = screen.getByRole("button", { name: /SQL: Project evidence/i });
    expect(sqlEvidence.getAttribute("aria-pressed")).toBe("true");
    const awsEvidence = screen.getByRole("button", { name: /AWS: Evidence missing/i });
    fireEvent.click(awsEvidence);
    expect(awsEvidence.getAttribute("aria-pressed")).toBe("true");
    expect(sqlEvidence.getAttribute("aria-pressed")).toBe("false");
  });

  it("renders a compact journey, concrete transformation and plain product boundaries", () => {
    const { container } = render(<ProductStory />);
    const text = container.textContent ?? "";

    expect(text).toMatch(/From finding the role to tracking the result/i);
    expect(text).toMatch(/Build and communicate data insights using SQL/i);
    expect(text).toMatch(/Created a reporting dashboard for a coursework project/i);
    expect(text).toMatch(/Created a SQL reporting dashboard for a coursework project/i);
    expect(text).toMatch(/From the listing/i);
    expect(text).toMatch(/Provided by you/i);
    expect(text).toMatch(/Not guaranteed/i);
  });

  it("supports arrow-key navigation through every application-record stage", () => {
    render(<ProductDemo />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(6);
    tabs[0]!.focus();
    fireEvent.keyDown(tabs[0]!, { key: "ArrowRight" });
    expect(tabs[1]!.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel").textContent).toMatch(/Decide what you can support/i);
    expect(screen.getByRole("heading", { name: "Graduate Data Analyst" })).toBeTruthy();
  });

  it("keeps one role connected across manual stages without auto-advancing", () => {
    vi.useFakeTimers();
    render(<ProductDemo />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]!.getAttribute("aria-selected")).toBe("true");
    vi.advanceTimersByTime(30_000);
    expect(tabs[0]!.getAttribute("aria-selected")).toBe("true");

    const expected = [
      /Start with the real listing/i,
      /Decide what you can support/i,
      /Suggested for review/i,
      /How did you use SQL/i,
      /Set by you/i,
      /No outcome recorded/i,
    ];
    tabs.forEach((tab, index) => {
      fireEvent.click(tab);
      expect(screen.getByRole("heading", { name: "Graduate Data Analyst" })).toBeTruthy();
      expect(screen.getByRole("tabpanel").textContent).toMatch(expected[index]!);
    });
    vi.useRealTimers();
  });

  it("exposes every FAQ as a keyboard-operable short-answer accordion", () => {
    render(<FAQSection />);
    expect(LANDING_FAQS).toHaveLength(4);
    for (const faq of LANDING_FAQS) {
      const trigger = screen.getByRole("button", { name: faq.q });
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      expect(faq.a.split(". ").length).toBeLessThanOrEqual(3);
    }
  });

  it("ends with a compact opportunity-first action", () => {
    const onGetStarted = vi.fn();
    const onAssessment = vi.fn();
    render(<FinalCTASection onGetStarted={onGetStarted} onAssessment={onAssessment} />);

    expect(screen.getByRole("heading", { level: 2 }).textContent).toMatch(/start with an opportunity worth pursuing/i);
    expect(screen.getByText(/build a stronger application from evidence you can support/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /explore opportunities/i }));
    expect(onGetStarted).toHaveBeenCalledOnce();
  });

  it("provides labelled desktop and mobile navigation without broken counsellor or pricing links", () => {
    render(
      <MemoryRouter>
        <LandingHeader onSignIn={vi.fn()} onSignUp={vi.fn()} />
        <LandingFooter />
      </MemoryRouter>,
    );

    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeTruthy();
    const menu = screen.getByRole("button", { name: "Open navigation menu" });
    expect(menu.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(menu);
    expect(screen.getByRole("navigation", { name: "Mobile navigation" })).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("navigation", { name: "Mobile navigation" })).toBeNull();
    expect(document.activeElement).toBe(menu);
    expect(screen.queryByRole("link", { name: /counsellors/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /pricing/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /blog/i })).toBeNull();
    expect(screen.getAllByRole("link", { name: "Product" }).length).toBeGreaterThan(0);
  });
});
