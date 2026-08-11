import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { RequirementEvidenceActions } from "./RequirementEvidenceActions";

function renderActions(
  overrides: Partial<
    React.ComponentProps<typeof RequirementEvidenceActions>
  > = {},
) {
  const props = { requirement: "SQL", role: "Data Analyst", ...overrides };
  return render(
    <MemoryRouter>
      <RequirementEvidenceActions {...props} />
    </MemoryRouter>,
  );
}

describe("RequirementEvidenceActions", () => {
  it("offers all five explicit decisions and does not add evidence by rendering", () => {
    const onAddEvidence = vi.fn();
    renderActions({ onAddEvidence });
    expect(
      screen.getByRole("button", { name: "I have this — add evidence" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "I'm learning this" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Find a practice/project idea" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Find a learning resource" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Not relevant" })).toBeTruthy();
    expect(onAddEvidence).not.toHaveBeenCalled();
  });

  it("requires a deliberate action before opening evidence editing", () => {
    const onAddEvidence = vi.fn();
    renderActions({ onAddEvidence });
    fireEvent.click(
      screen.getByRole("button", { name: "I have this — add evidence" }),
    );
    expect(onAddEvidence).toHaveBeenCalledOnce();
  });

  it("shows a practical project and an honest unavailable resource state", () => {
    renderActions();
    fireEvent.click(
      screen.getByRole("button", { name: "Find a practice/project idea" }),
    );
    expect(screen.getByRole("status").textContent).toContain(
      "Create a small SQL evidence sample",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Find a learning resource" }),
    );
    expect(screen.getByRole("status").textContent).toContain(
      "No maintained external resource",
    );
    expect(
      screen.queryByRole("link", { name: /external resource/i }),
    ).toBeNull();
  });

  it("supports keyboard activation and reports a local not-relevant decision", () => {
    renderActions();
    const button = screen.getByRole("button", { name: "Not relevant" });
    button.focus();
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.click(button);
    expect(document.activeElement).toBe(button);
    expect(screen.getByRole("status").textContent).toContain(
      "Marked not relevant for this visit",
    );
  });
});
