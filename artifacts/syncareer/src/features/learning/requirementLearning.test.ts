import { describe, expect, it } from "vitest";
import {
  buildEvidenceHref,
  practiceIdeaFor,
  resourcesForRequirement,
} from "./requirementLearning";

describe("requirement learning boundary", () => {
  it("creates a bounded evidence-building exercise without claiming completion", () => {
    const idea = practiceIdeaFor("SQL", "Data Analyst");
    expect(idea.title).toContain("SQL");
    expect(idea.intendedOutcome).toContain("work sample");
    expect(idea.steps).toHaveLength(4);
    expect(JSON.stringify(idea)).not.toMatch(/certificate|qualified|mastered/i);
  });

  it("has no external catalogue until resources have an accountable review cadence", () => {
    expect(resourcesForRequirement("SQL")).toEqual([]);
  });

  it("preserves requirement and application context without using the skills prefill", () => {
    const href = buildEvidenceHref({
      requirement: "SQL",
      role: "Analyst",
      applicationId: "app-1",
      returnTo: "/applications?application=app-1",
    });
    const url = new URL(href, "https://syncareer.test");
    expect(url.pathname).toBe("/cv-builder");
    expect(url.searchParams.get("focusSkill")).toBe("SQL");
    expect(url.searchParams.get("application")).toBe("app-1");
    expect(url.searchParams.get("returnTo")).toBe(
      "/applications?application=app-1",
    );
    expect(url.searchParams.has("skills")).toBe(false);
  });

  it("drops unsafe external return locations", () => {
    expect(
      buildEvidenceHref({
        requirement: "SQL",
        returnTo: "https://attacker.example",
      }),
    ).not.toContain("returnTo");
  });
});
