import { useRef, useState } from "react";
import {
  ExternalLink,
  Bookmark,
  Check,
  Circle,
  FileText,
  Mic2,
} from "lucide-react";

export const APPLICATION_STAGES = [
  { id: "opportunity", label: "Opportunity" },
  { id: "evidence", label: "Evidence" },
  { id: "cv", label: "CV" },
  { id: "interview", label: "Interview" },
  { id: "action", label: "Next action" },
  { id: "outcome", label: "Outcome" },
] as const;

export type ApplicationStage = (typeof APPLICATION_STAGES)[number]["id"];

const requirementRows = [
  { requirement: "SQL", evidence: "Project evidence", detail: "Reporting dashboard" },
  { requirement: "Python", evidence: "Coursework", detail: "Data analysis module" },
  { requirement: "AWS", evidence: "Evidence missing", detail: "No supporting example yet" },
] as const;

type Requirement = (typeof requirementRows)[number]["requirement"];

interface ApplicationRecordProps {
  activeStage?: ApplicationStage;
  onStageChange?: (stage: ApplicationStage) => void;
  idPrefix?: string;
  className?: string;
  showControls?: boolean;
}

export default function ApplicationRecord({
  activeStage,
  onStageChange,
  idPrefix = "application-record",
  className = "",
  showControls = true,
}: ApplicationRecordProps) {
  const [internalStage, setInternalStage] = useState<ApplicationStage>("opportunity");
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement>("SQL");
  const [transitionDirection, setTransitionDirection] = useState<"forward" | "backward">("forward");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const active = activeStage ?? internalStage;
  const activeIndex = APPLICATION_STAGES.findIndex((stage) => stage.id === active);

  const selectStage = (stage: ApplicationStage) => {
    const nextIndex = APPLICATION_STAGES.findIndex((item) => item.id === stage);
    setTransitionDirection(nextIndex < activeIndex ? "backward" : "forward");
    if (stage === "evidence" || stage === "cv" || stage === "interview") {
      setSelectedRequirement("SQL");
    } else if (stage === "action") {
      setSelectedRequirement("AWS");
    }
    setInternalStage(stage);
    onStageChange?.(stage);
  };

  const move = (index: number) => {
    const normalized = (index + APPLICATION_STAGES.length) % APPLICATION_STAGES.length;
    selectStage(APPLICATION_STAGES[normalized]!.id);
    requestAnimationFrame(() => tabRefs.current[normalized]?.focus());
  };

  return (
    <article
      className={`landing-application-record overflow-hidden border border-border bg-card shadow-[0_28px_70px_-42px_hsl(var(--foreground)/0.42)] ${className}`}
      aria-label="Illustrative Syncareer application record"
    >
      <header className="flex flex-col gap-4 border-b bg-secondary/40 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div>
          <p className="eyebrow text-primary">Application / 0147 · illustrative record</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">Graduate Data Analyst</h2>
          <p className="mt-1 text-sm text-muted-foreground">Example organisation · Accra · Entry level</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            <Bookmark className="h-3.5 w-3.5" aria-hidden="true" /> Saved
          </span>
        </div>
      </header>

      {showControls && (
        <div
          id={`${idPrefix}-workflow`}
          role="tablist"
          aria-label="Illustrative application record stages"
          className="flex snap-x overflow-x-auto border-b bg-background px-2 py-2"
        >
          {APPLICATION_STAGES.map((stage, index) => (
            <button
              key={stage.id}
              ref={(node) => { tabRefs.current[index] = node; }}
              type="button"
              role="tab"
              id={`${idPrefix}-tab-${stage.id}`}
              aria-controls={`${idPrefix}-panel-${stage.id}`}
              aria-selected={active === stage.id}
              tabIndex={active === stage.id ? 0 : -1}
              onClick={() => selectStage(stage.id)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                  event.preventDefault();
                  move(activeIndex + 1);
                } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                  event.preventDefault();
                  move(activeIndex - 1);
                } else if (event.key === "Home") {
                  event.preventDefault();
                  move(0);
                } else if (event.key === "End") {
                  event.preventDefault();
                  move(APPLICATION_STAGES.length - 1);
                }
              }}
              className={`landing-record-tab relative min-h-10 shrink-0 snap-start px-3 py-2 text-left text-xs font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none sm:px-3.5 ${active === stage.id ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <span className="mr-1.5 text-[10px] opacity-70">0{index + 1}</span>{stage.label}
              <span className="landing-record-tab-indicator" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-[minmax(0,1.04fr)_minmax(230px,0.96fr)]">
        <section className="border-b p-4 sm:p-5 lg:border-b-0 lg:border-r" aria-label="Record fields">
          <div className="grid gap-3 border-b pb-4 sm:grid-cols-3">
            <Field label="Source" value="External listing" />
            <Field label="Location" value="Accra" />
            <Field label="Current step" value={stageLabel(active)} />
          </div>
          <div className="pt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-muted-foreground">Requirements and your evidence</p>
              <span className="text-xs font-semibold text-success">2 / 3 supported</span>
            </div>
            <ul className="mt-3 divide-y border-y">
              {requirementRows.map((row) => {
                const supported = row.evidence !== "Evidence missing";
                const isSelected = selectedRequirement === row.requirement;
                return (
                  <li key={row.requirement}>
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      aria-label={`${row.requirement}: ${row.evidence}. ${row.detail}`}
                      aria-describedby={`${idPrefix}-requirement-${row.requirement.toLowerCase()}-detail`}
                      onMouseEnter={() => setSelectedRequirement(row.requirement)}
                      onFocus={() => setSelectedRequirement(row.requirement)}
                      onClick={() => setSelectedRequirement(row.requirement)}
                      className={`group/requirement grid w-full gap-2 border-l-2 px-3 py-3 text-left transition-[background-color,border-color] duration-150 ease-out motion-reduce:transition-none sm:grid-cols-[0.62fr_1fr] sm:items-center ${isSelected ? "border-primary bg-primary/[0.075]" : "border-transparent hover:border-primary/40 hover:bg-secondary/60"} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring`}
                    >
                      <span className={`text-sm font-semibold transition-colors duration-150 motion-reduce:transition-none ${isSelected ? "text-primary" : ""}`}>{row.requirement}</span>
                      <span className={`flex items-center gap-2 text-sm ${supported ? "text-success" : "text-muted-foreground"}`}>
                        {supported ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : <Circle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                        <span>
                          <span className="font-medium">{row.evidence}</span>
                          <span id={`${idPrefix}-requirement-${row.requirement.toLowerCase()}-detail`} className={`${isSelected ? "inline" : "hidden sm:inline"} text-muted-foreground`}> · {row.detail}</span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section
          key={active}
          role="tabpanel"
          id={`${idPrefix}-panel-${active}`}
          aria-labelledby={`${idPrefix}-tab-${active}`}
          tabIndex={0}
          data-direction={transitionDirection}
          className="min-h-[328px] p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:min-h-[270px] sm:p-5"
        >
          <StageDetail stage={active} />
        </section>
      </div>
    </article>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function StageDetail({ stage }: { stage: ApplicationStage }) {
  const details: Record<ApplicationStage, { label: string; title: string; body: React.ReactNode }> = {
    opportunity: {
      label: "Opportunity context",
      title: "Start with the real listing.",
      body: <><p className="text-sm leading-6 text-muted-foreground">See the organisation, location and listed requirements before deciding whether the role is worth pursuing.</p><p className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"><ExternalLink className="h-4 w-4" aria-hidden="true" /> Open original source</p></>,
    },
    evidence: {
      label: "Evidence review",
      title: "Decide what you can support.",
      body: <><p className="text-sm leading-6 text-muted-foreground">For the SQL requirement, you added: “Created a reporting dashboard for a coursework project.” AWS remains a visible gap.</p><p className="mt-4 text-xs leading-5 text-muted-foreground"><span className="font-semibold text-success">Evidence provided by you.</span> Nothing is added to your CV automatically.</p></>,
    },
    cv: {
      label: "CV preparation",
      title: "Turn a vague line into specific evidence.",
      body: <><p className="text-xs text-muted-foreground line-through">Worked on a data project.</p><div className="mt-3 border-l-2 border-primary pl-3"><p className="text-xs font-semibold text-primary">Suggested for review</p><p className="mt-2 text-sm leading-6">Created a SQL reporting dashboard for a coursework project.</p></div><p className="mt-4 text-xs leading-5 text-muted-foreground"><FileText className="mr-1 inline h-3.5 w-3.5 text-primary" aria-hidden="true" /> Uses only the facts supplied in this illustration.</p></>,
    },
    interview: {
      label: "Interview preparation",
      title: "Practice stays tied to this role.",
      body: <><p className="text-sm font-medium">How did you use SQL to turn coursework data into a clear dashboard?</p><p className="mt-3 text-sm leading-6 text-muted-foreground">The question uses the same requirement and evidence, so your practice stays focused on this role.</p><p className="mt-4 text-xs leading-5 text-muted-foreground"><Mic2 className="mr-1 inline h-3.5 w-3.5 text-primary" aria-hidden="true" /> Practice guidance is not an employer assessment.</p></>,
    },
    action: {
      label: "Next action",
      title: "Leave yourself one clear task.",
      body: <><div className="border-y py-3"><p className="text-xs font-semibold text-primary">Set by you</p><p className="mt-1 text-sm font-semibold">Check whether the role needs AWS evidence before applying</p><p className="mt-1 text-xs text-muted-foreground">No due date set</p></div><p className="mt-4 text-sm leading-6 text-muted-foreground">Your next action stays connected to the Graduate Data Analyst application.</p></>,
    },
    outcome: {
      label: "Outcome",
      title: "Track what actually happened.",
      body: <><p className="text-sm leading-6 text-muted-foreground">No outcome is set in this illustration. You record an application, interview or offer outcome yourself; Syncareer does not infer one.</p><p className="mt-4 text-xs font-semibold text-muted-foreground">No outcome recorded</p></>,
    },
  };
  const detail = details[stage];
  return <div className="flex h-full flex-col justify-between"><div><p className="eyebrow text-primary">{detail.label}</p><h3 className="mt-2 text-lg font-semibold tracking-[-0.025em]">{detail.title}</h3><div className="mt-4">{detail.body}</div></div><p className="mt-8 text-[11px] leading-5 text-muted-foreground">Illustrative product state — not a live listing or user record.</p></div>;
}

function stageLabel(stage: ApplicationStage) {
  return APPLICATION_STAGES.find((item) => item.id === stage)?.label ?? "Saved";
}
