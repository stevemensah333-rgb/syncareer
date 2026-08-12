import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Bookmark,
  Check,
  Circle,
  FileText,
  Mic2,
  TimerReset,
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

interface ApplicationRecordProps {
  activeStage?: ApplicationStage;
  onStageChange?: (stage: ApplicationStage) => void;
  autoProgress?: boolean;
  idPrefix?: string;
  className?: string;
  showControls?: boolean;
}

export default function ApplicationRecord({
  activeStage,
  onStageChange,
  autoProgress = false,
  idPrefix = "application-record",
  className = "",
  showControls = true,
}: ApplicationRecordProps) {
  const [internalStage, setInternalStage] = useState<ApplicationStage>("opportunity");
  const [userPaused, setUserPaused] = useState(false);
  const [documentHidden, setDocumentHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const active = activeStage ?? internalStage;
  const activeIndex = APPLICATION_STAGES.findIndex((stage) => stage.id === active);

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return undefined;
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    const updateVisibility = () => setDocumentHidden(document.hidden);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    if (!autoProgress || userPaused || documentHidden || reducedMotion) return undefined;
    const timer = window.setInterval(() => {
      const next = APPLICATION_STAGES[(activeIndex + 1) % APPLICATION_STAGES.length]!.id;
      setInternalStage(next);
      onStageChange?.(next);
    }, 7200);
    return () => window.clearInterval(timer);
  }, [activeIndex, autoProgress, documentHidden, onStageChange, reducedMotion, userPaused]);

  const selectStage = (stage: ApplicationStage, fromUser = false) => {
    if (fromUser) setUserPaused(true);
    setInternalStage(stage);
    onStageChange?.(stage);
  };

  const move = (index: number) => {
    const normalized = (index + APPLICATION_STAGES.length) % APPLICATION_STAGES.length;
    selectStage(APPLICATION_STAGES[normalized]!.id, true);
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
          {autoProgress && !userPaused && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <TimerReset className="h-3.5 w-3.5" aria-hidden="true" /> Slow preview
            </span>
          )}
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
              onClick={() => selectStage(stage.id, true)}
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
              className={`min-h-10 shrink-0 snap-start border-b-2 px-3 py-2 text-left text-xs font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none sm:px-3.5 ${active === stage.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <span className="mr-1.5 text-[10px] opacity-70">0{index + 1}</span>{stage.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-[minmax(0,1.04fr)_minmax(230px,0.96fr)]">
        <section className="border-b p-4 sm:p-5 lg:border-b-0 lg:border-r" aria-label="Record fields">
          <div className="grid gap-3 border-b pb-4 sm:grid-cols-3">
            <Field label="Source" value="External listing" state="recorded" />
            <Field label="Location" value="Accra" state="recorded" />
            <Field label="Stage" value={stageLabel(active)} state="controlled" />
          </div>
          <div className="pt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="eyebrow">Requirements → evidence checks</p>
              <span className="text-xs font-semibold text-success">2 / 3 supported</span>
            </div>
            <ul className="mt-3 divide-y border-y">
              {requirementRows.map((row) => {
                const supported = row.evidence !== "Evidence missing";
                const highlighted = active === "evidence" || active === "cv";
                return (
                  <li key={row.requirement} className={`grid gap-2 px-1 py-3 transition-colors duration-200 motion-reduce:transition-none sm:grid-cols-[0.62fr_1fr] sm:items-center ${highlighted ? "bg-primary/[0.025]" : ""}`}>
                    <span className="text-sm font-semibold">{row.requirement}</span>
                    <span className={`flex items-center gap-2 text-sm ${supported ? "text-success" : "text-muted-foreground"}`}>
                      {supported ? <Check className="h-4 w-4" aria-hidden="true" /> : <Circle className="h-3.5 w-3.5" aria-hidden="true" />}
                      <span><span className="font-medium">{row.evidence}</span><span className="hidden text-muted-foreground sm:inline"> · {row.detail}</span></span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section
          role="tabpanel"
          id={`${idPrefix}-panel-${active}`}
          aria-labelledby={`${idPrefix}-tab-${active}`}
          tabIndex={0}
          className="min-h-[250px] p-4 transition-[background-color,opacity] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none sm:p-5"
        >
          <StageDetail stage={active} />
        </section>
      </div>
    </article>
  );
}

function Field({ label, value, state }: { label: string; value: string; state: "recorded" | "controlled" }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
      <p className={`mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${state === "recorded" ? "text-success" : "text-primary"}`}>
        {state === "recorded" ? "● Recorded" : "● User controlled"}
      </p>
    </div>
  );
}

function StageDetail({ stage }: { stage: ApplicationStage }) {
  const details: Record<ApplicationStage, { label: string; title: string; body: React.ReactNode }> = {
    opportunity: {
      label: "Opportunity context",
      title: "Keep the original role in view.",
      body: <><p className="text-sm leading-6 text-muted-foreground">The record retains the source label, location, level, and listed requirements while you decide whether the role is worth pursuing.</p><p className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"><ArrowUpRight className="h-4 w-4" aria-hidden="true" /> Original source available</p></>,
    },
    evidence: {
      label: "Evidence review",
      title: "Requirements become evidence checks.",
      body: <><p className="text-sm leading-6 text-muted-foreground">SQL and Python are connected to examples you supplied. AWS remains a visible gap; nothing is added to the CV automatically.</p><p className="mt-4 text-xs leading-5 text-muted-foreground"><span className="font-semibold text-success">Recorded evidence</span> remains distinct from suggestions.</p></>,
    },
    cv: {
      label: "CV preparation",
      title: "Only proof can support a claim.",
      body: <><div className="border-l-2 border-primary pl-3"><p className="eyebrow text-primary">Guidance · review before use</p><p className="mt-2 text-sm leading-6">Built a SQL-backed reporting dashboard for coursework analysis.</p></div><p className="mt-4 text-xs leading-5 text-muted-foreground"><FileText className="mr-1 inline h-3.5 w-3.5 text-primary" aria-hidden="true" /> Draft wording is guidance, not a new fact about you.</p></>,
    },
    interview: {
      label: "Interview preparation",
      title: "Practice stays tied to this role.",
      body: <><p className="text-sm font-medium">How did you investigate a data-quality issue before reporting it?</p><p className="mt-3 text-sm leading-6 text-muted-foreground">The role requirements and your recorded examples give practice a shared reference point.</p><p className="mt-4 text-xs leading-5 text-muted-foreground"><Mic2 className="mr-1 inline h-3.5 w-3.5 text-primary" aria-hidden="true" /> Interview guidance is not an employer assessment.</p></>,
    },
    action: {
      label: "Application memory",
      title: "Record what you chose to do next.",
      body: <><div className="border-y py-3"><p className="eyebrow text-primary">Next action · user controlled</p><p className="mt-1 text-sm font-semibold">Review missing AWS evidence</p><p className="mt-1 text-xs text-muted-foreground">No due date recorded</p></div><p className="mt-4 text-sm leading-6 text-muted-foreground">Stage, CV link, practice, and next action stay attached to this application record.</p></>,
    },
    outcome: {
      label: "Outcome",
      title: "Record an outcome deliberately.",
      body: <><p className="text-sm leading-6 text-muted-foreground">No outcome is recorded for this illustration. Syncareer does not infer an external submission, interview result, or offer.</p><p className="mt-4 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">○ Not claimed</p></>,
    },
  };
  const detail = details[stage];
  return <div className="flex h-full flex-col justify-between"><div><p className="eyebrow text-primary">{detail.label}</p><h3 className="mt-2 text-lg font-semibold tracking-[-0.025em]">{detail.title}</h3><div className="mt-4">{detail.body}</div></div><p className="mt-8 text-[11px] leading-5 text-muted-foreground">Illustrative product state — not a live listing or user record.</p></div>;
}

function stageLabel(stage: ApplicationStage) {
  return APPLICATION_STAGES.find((item) => item.id === stage)?.label ?? "Saved";
}
