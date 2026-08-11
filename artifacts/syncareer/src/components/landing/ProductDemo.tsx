import { useRef, useState, type ReactElement } from "react";
import {
  Bookmark,
  ExternalLink,
} from "lucide-react";

export const DEMO_STEPS = [
  { id: "opportunity", label: "Opportunity" },
  { id: "evidence", label: "Evidence & CV" },
  { id: "interview", label: "Interview" },
  { id: "application", label: "Next action" },
] as const;

export type DemoStep = (typeof DEMO_STEPS)[number]["id"];

function OpportunityPanel() {
  return (
    <div className="space-y-5 transition-opacity duration-[250ms] ease-out motion-reduce:transition-none">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            External opportunity · Original source available
          </p>
          <h3 className="mt-1 text-xl font-semibold">Graduate Data Analyst</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Example organisation · Accra · Entry level
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          <Bookmark className="h-3.5 w-3.5" />
          Saved
        </span>
      </div>
      <dl className="grid gap-3 border-y py-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">Source</dt>
          <dd className="mt-1 text-sm font-medium">External listing</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Deadline</dt>
          <dd className="mt-1 text-sm font-medium">Not provided</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Listed skills</dt>
          <dd className="mt-1 text-sm font-medium">SQL · reporting</dd>
        </div>
      </dl>
      <p className="flex items-center gap-2 text-sm text-primary">
        <ExternalLink className="h-4 w-4" />
        Open the original source before applying
      </p>
    </div>
  );
}

function EvidencePanel() {
  return (
    <div className="space-y-5 transition-opacity duration-[250ms] ease-out motion-reduce:transition-none">
      <div>
        <p className="text-xs font-medium text-muted-foreground">
          Requirement from the same illustrative role
        </p>
        <h3 className="mt-1 text-xl font-semibold">SQL</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-success/30 bg-success/5 p-4">
          <p className="text-sm font-semibold text-success">
            I have this — add evidence
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Add a truthful project or experience example. The requirement is
            never copied into the CV automatically.
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm font-semibold">CV evidence draft</p>
          <p className="mt-2 text-sm leading-6">
            “Cleaned and analysed a 2,000-row survey dataset using SQL, then
            documented three data-quality issues.”
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Illustrative wording — use only facts that are true for you.
          </p>
        </div>
      </div>
    </div>
  );
}

function InterviewPanel() {
  return (
    <div className="space-y-5 transition-opacity duration-[250ms] ease-out motion-reduce:transition-none">
      <div>
        <p className="text-xs font-medium text-muted-foreground">
          Practice context · Graduate Data Analyst
        </p>
        <h3 className="mt-1 text-xl font-semibold">
          Evidence-based interview preparation
        </h3>
      </div>
      <blockquote className="border-l-2 border-primary pl-4 text-base leading-7">
        Tell me about a time you found and resolved a data-quality problem.
      </blockquote>
      <div className="rounded-lg bg-muted p-4">
        <p className="text-sm font-semibold">Report rubric</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Relevance · specificity · evidence · clarity
        </p>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        Questions and feedback may use AI and can be incomplete or inaccurate.
        They are practice guidance, not an employer assessment.
      </p>
    </div>
  );
}

function ApplicationPanel() {
  return (
    <div className="space-y-5 transition-opacity duration-[250ms] ease-out motion-reduce:transition-none">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Application workspace
          </p>
          <h3 className="mt-1 text-xl font-semibold">Graduate Data Analyst</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Example organisation
          </p>
        </div>
        <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          Applied
        </span>
      </div>
      <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-warning">
          Next action
        </p>
        <p className="mt-2 font-semibold">Follow up on the application</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Due Friday · recorded by the user
        </p>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        The stage, notes, linked CV, interview practice, and outcome remain
        attached to this application. Syncareer does not infer that an external
        application was submitted.
      </p>
    </div>
  );
}

const PANELS: Record<DemoStep, () => ReactElement> = {
  opportunity: OpportunityPanel,
  evidence: EvidencePanel,
  interview: InterviewPanel,
  application: ApplicationPanel,
};

export default function ProductDemo() {
  const [active, setActive] = useState<DemoStep>("opportunity");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = DEMO_STEPS.findIndex((step) => step.id === active);
  const Panel = PANELS[active];

  const move = (index: number) => {
    const next = (index + DEMO_STEPS.length) % DEMO_STEPS.length;
    setActive(DEMO_STEPS[next]!.id);
    requestAnimationFrame(() => tabRefs.current[next]?.focus());
  };

  return (
    <div className="w-full overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex flex-col gap-2 border-b bg-secondary/80 px-4 py-3.5 text-secondary-foreground sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">
            One application, four connected steps
          </p>
          <p className="text-xs text-secondary-foreground/70">
            Illustrative product state — not a live listing or user record
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-background/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            Click a step to see what happens · Keyboard: ↑↓ / ←→
          </span>
          <span className="hidden text-xs font-medium sm:inline">Graduate Data Analyst</span>
        </div>
      </div>
      <div className="grid md:grid-cols-[210px_minmax(0,1fr)]">
        <div
          id="workflow"
          role="tablist"
          aria-label="Illustrative application journey"
          aria-orientation="vertical"
          className="grid grid-cols-2 border-b p-2 md:grid-cols-1 md:border-b-0 md:border-r"
        >
          {DEMO_STEPS.map((step, index) => (
            <button
              key={step.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`demo-tab-${step.id}`}
              aria-controls={`demo-panel-${step.id}`}
              aria-selected={active === step.id}
              tabIndex={active === step.id ? 0 : -1}
              onClick={() => setActive(step.id)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                  event.preventDefault();
                  move(activeIndex + 1);
                } else if (
                  event.key === "ArrowUp" ||
                  event.key === "ArrowLeft"
                ) {
                  event.preventDefault();
                  move(activeIndex - 1);
                } else if (event.key === "Home") {
                  event.preventDefault();
                  move(0);
                } else if (event.key === "End") {
                  event.preventDefault();
                  move(DEMO_STEPS.length - 1);
                }
              }}
              className={`flex items-center min-h-11 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${
                active === step.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span className="mr-2 text-xs opacity-70">0{index + 1}</span>
              {step.label}
            </button>
          ))}
        </div>
        <div
          role="tabpanel"
          id={`demo-panel-${active}`}
          aria-labelledby={`demo-tab-${active}`}
          tabIndex={0}
          className="min-h-[330px] p-5 transition-opacity duration-[250ms] ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none sm:p-7"
        >
          <Panel />
        </div>
      </div>
    </div>
  );
}
