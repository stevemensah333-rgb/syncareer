import { useRef, useState, type ReactElement } from "react";
import {
  Bookmark,
  BriefcaseBusiness,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  Mic2,
  ShieldCheck,
} from "lucide-react";

const demoSteps = [
  { id: "opportunity", label: "Opportunity" },
  { id: "evidence", label: "Evidence & CV" },
  { id: "interview", label: "Interview" },
  { id: "application", label: "Next action" },
] as const;

type DemoStep = (typeof demoSteps)[number]["id"];

function OpportunityPanel() {
  return (
    <div className="space-y-5">
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
    <div className="space-y-5">
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
    <div className="space-y-5">
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
    <div className="space-y-5">
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

const panels: Record<DemoStep, () => ReactElement> = {
  opportunity: OpportunityPanel,
  evidence: EvidencePanel,
  interview: InterviewPanel,
  application: ApplicationPanel,
};

function ProductDemo() {
  const [active, setActive] = useState<DemoStep>("opportunity");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = demoSteps.findIndex((step) => step.id === active);
  const Panel = panels[active];
  const move = (index: number) => {
    const next = (index + demoSteps.length) % demoSteps.length;
    setActive(demoSteps[next]!.id);
    requestAnimationFrame(() => tabRefs.current[next]?.focus());
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-[0_22px_65px_-48px_hsl(var(--secondary)/0.55)]">
      <div className="flex flex-col gap-3 border-b bg-secondary px-4 py-4 text-secondary-foreground sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">
            One application, four connected steps
          </p>
          <p className="text-xs text-secondary-foreground/70">
            Illustrative product state — not a live listing or user record
          </p>
        </div>
        <span className="text-xs">Graduate Data Analyst</span>
      </div>
      <div className="grid md:grid-cols-[220px_minmax(0,1fr)]">
        <div
          id="workflow"
          role="tablist"
          aria-label="Illustrative application journey"
          aria-orientation="vertical"
          className="grid grid-cols-2 border-b p-2 md:grid-cols-1 md:border-b-0 md:border-r"
        >
          {demoSteps.map((step, index) => (
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
                  move(demoSteps.length - 1);
                }
              }}
              className={`min-h-11 rounded-md px-3 py-2 text-left text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active === step.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
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
          className="min-h-[330px] p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:p-7"
        >
          <Panel />
        </div>
      </div>
    </div>
  );
}

const capabilities = [
  {
    icon: BriefcaseBusiness,
    title: "Find and save a real external role",
    copy: "Inspect source, organisation, location, level, recency, and known deadlines without invented salary or verification claims.",
  },
  {
    icon: FileCheck2,
    title: "Build truthful evidence",
    copy: "Compare listed requirements with evidence you actually have, then improve a role-specific CV without fabricating experience.",
  },
  {
    icon: Mic2,
    title: "Prepare and track",
    copy: "Practise with role context, record the next action, and update stage or outcome only when it actually changes.",
  },
];

export default function ProductStory() {
  return (
    <>
      <section
        id="product"
        className="scroll-mt-24 border-b"
        aria-labelledby="product-demo-title"
      >
        <div className="mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="mb-8 max-w-2xl">
            <h2
              id="product-demo-title"
              className="text-balance text-3xl font-semibold tracking-[-0.035em] sm:text-4xl"
            >
              Follow one role from discovery to the next action.
            </h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Use the controls to inspect how the same illustrative application
              context moves through Syncareer.
            </p>
          </div>
          <ProductDemo />
        </div>
      </section>
      <section
        className="border-b bg-secondary text-secondary-foreground"
        aria-labelledby="capabilities-title"
      >
        <div className="mx-auto w-full max-w-[1400px] px-4 py-14 sm:px-6 lg:px-8">
          <h2 id="capabilities-title" className="sr-only">
            What Syncareer helps you do
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {capabilities.map(({ icon: Icon, title, copy }) => (
              <article key={title}>
                <Icon
                  className="h-5 w-5 text-primary-foreground"
                  aria-hidden="true"
                />
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-secondary-foreground/70">
                  {copy}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section
        id="method"
        className="scroll-mt-24 border-b"
        aria-labelledby="method-title"
      >
        <div className="mx-auto grid w-full max-w-[1400px] gap-8 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[0.7fr_1.3fr] lg:px-8">
          <div>
            <ShieldCheck className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2
              id="method-title"
              className="mt-4 text-3xl font-semibold tracking-[-0.035em]"
            >
              Know what each signal means.
            </h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Syncareer supports your judgement; it does not replace it.
            </p>
          </div>
          <ul className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {[
              [
                "Source labels",
                "External opportunities retain the stored source and original link when available; they are not independently verified.",
              ],
              [
                "Deterministic CV guidance",
                "Completion and evidence checks examine entered content. They do not guarantee applicant-tracking-system success.",
              ],
              [
                "Bounded AI",
                "Generated suggestions remain proposals, use only supplied context, and may be inaccurate. You decide whether to use them.",
              ],
              [
                "Recorded outcomes",
                "Application stages, external submissions, next actions, and outcomes change only through deliberate user actions.",
              ],
            ].map(([title, copy]) => (
              <li key={title} className="flex gap-3">
                <CheckCircle2
                  className="mt-1 h-4 w-4 shrink-0 text-success"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="text-sm font-semibold">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {copy}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
