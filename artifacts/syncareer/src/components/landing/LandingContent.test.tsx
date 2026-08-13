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
  it("leads with the pain-oriented headline and one integrated application record", () => {
    const onGetStarted = vi.fn();
    const onAssessment = vi.fn();
    const { container } = render(<HeroSection onGetStarted={onGetStarted} onAssessment={onAssessment} />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/stop guessing what an application is missing/i);
    const exploreButton = screen.getByRole("button", { name: /explore opportunities/i });
    const inspectButton = screen.getByRole("button", { name: /inspect the record/i });
    const assessmentButton = screen.getByRole("button", { name: /not sure what fits/i });

    expect(exploreButton).toBeTruthy();
    expect(inspectButton).toBeTruthy();
    expect(assessmentButton).toBeTruthy();
    fireEvent.click(exploreButton);
    expect(onGetStarted).toHaveBeenCalledOnce();
    expect(container.textContent).toMatch(/Application \/ 0147/i);
    expect(container.textContent).toMatch(/Requirements → evidence checks/i);
    expect(container.textContent).toMatch(/External listings retain source labels/i);

    const sqlEvidence = screen.getByRole("button", { name: /SQL: Project evidence/i });
    expect(sqlEvidence.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(sqlEvidence);
    expect(sqlEvidence.getAttribute("aria-pressed")).toBe("true");
  });

  it("renders the continuous record narrative and explicit product boundaries", () => {
    const { container } = render(<ProductStory />);
    const text = container.textContent ?? "";

    expect(text).toMatch(/The role stays legible as your work changes around it/i);
    expect(text).toMatch(/Requirements become evidence checks—not claims/i);
    expect(text).toMatch(/CV guidance is useful only when it stays reviewable/i);
    expect(text).toMatch(/An outcome is meaningful precisely because it is not assumed/i);
    expect(text).toMatch(/A working record should make its boundaries visible/i);
    expect(text).toMatch(/External opportunity source and listing fields/i);
    expect(text).toMatch(/User controlled/i);
    expect(text).toMatch(/Not claimed/i);
  });

  it("supports arrow-key navigation through every application-record stage", () => {
    render(<ProductDemo />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(6);
    tabs[0]!.focus();
    fireEvent.keyDown(tabs[0]!, { key: "ArrowRight" });
    expect(tabs[1]!.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel").textContent).toMatch(/Requirements become evidence checks/i);
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

  it("makes application continuity explicit in the single high-contrast closing chapter", () => {
    const onGetStarted = vi.fn();
    const onAssessment = vi.fn();
    render(<FinalCTASection onGetStarted={onGetStarted} onAssessment={onAssessment} />);

    expect(screen.getByRole("heading", { level: 2 }).textContent).toMatch(/should not disappear after you click Apply/i);
    expect(screen.getByText(/Application memory/i)).toBeTruthy();
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
    expect(screen.queryByRole("link", { name: /counsellors/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /pricing/i })).toBeNull();
    expect(screen.getAllByRole("link", { name: "Product" }).length).toBeGreaterThan(0);
  });
});
