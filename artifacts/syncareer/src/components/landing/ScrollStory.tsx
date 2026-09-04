import { useEffect, useRef, useState } from "react";
import { ArrowRight, Bookmark, CheckCircle2, FileText, Mic2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimatedSection from "./AnimatedSection";
import ApplicationRecord, { APPLICATION_STAGES } from "./ApplicationRecord";

/** Six-stage scroll story that progressively reveals the Syncareer workflow.
 *
 * Each panel pairs stage copy with a live application record that scrolls to
 * the matching tab, so the visitor understands the relationship between
 * opportunity → evidence → CV → interview → action → outcome through product
 * interaction rather than a wall of marketing copy.
 */

interface StagePanelProps {
  stage: (typeof APPLICATION_STAGES)[number];
  index: number;
  isActive: boolean;
  onActivate: (stageId: string) => void;
}

function StagePanel({ stage, index, isActive, onActivate }: StagePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive && panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
      const tab = document.getElementById(`story-record-tab-${stage.id}`);
      tab?.focus();
      tab?.click();
    }
  }, [isActive, stage.id]);

  return (
    <article
      ref={panelRef}
      className={`story-panel group relative overflow-hidden rounded-surface border ${
        isActive
          ? "border-primary/40 bg-card shadow-[0_28px_70px_-42px_hsl(var(--foreground)/0.38)]"
          : "border-border bg-card/95"
      }`}
      aria-current={isActive ? "true" : undefined}
    >
      <header className="flex flex-col gap-3 border-b border-border/80 bg-secondary/40 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:py-5">
        <div className="min-w-0">
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
            {index + 1} / {APPLICATION_STAGES.length}
          </span>
          <h3 className="mt-1 text-lg font-semibold tracking-[-0.02em]">{stage.label}</h3>
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <span className="inline-flex items-center gap-1.5 border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-selected-foreground">
              <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
              Active stage
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onActivate(stage.id)}
            className="hidden sm:inline-flex gap-1.5 text-xs"
          >
            Inspect in workspace <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </header>

      {!isActive && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-card/40 opacity-0 transition-opacity duration-150 group-hover:opacity-100 motion-reduce:transition-none">
          <span className="flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border">
            Scroll to inspect
          </span>
        </div>
      )}

      <div className="px-5 py-4 sm:px-6 sm:py-5">
        <StageBody stage={stage} />
      </div>
    </article>
  );
}

function StageBody({ stage }: { stage: (typeof APPLICATION_STAGES)[number] }) {
  const bodies: Record<string, { cue: string; body: React.ReactNode; note?: string }> = {
    opportunity: {
      cue: "Start with the real listing.",
      body: (
        <>
          <p className="text-sm leading-6 text-muted-foreground">
            See the organisation, location and listed requirements before deciding whether the role is worth pursuing.
          </p>
          <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-primary">
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Open original source
          </div>
        </>
      ),
      note: "External opportunities keep their original source links.",
    },
    evidence: {
      cue: "Decide what you can support.",
      body: (
        <>
          <p className="text-sm leading-6 text-muted-foreground">
            For the SQL requirement, you added: “Created a reporting dashboard for a coursework project.” AWS remains a visible gap.
          </p>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            <span className="font-semibold text-success">Evidence provided by you.</span> Nothing is added to your CV automatically.
          </p>
        </>
      ),
      note: "You decide which experience supports a role requirement.",
    },
    cv: {
      cue: "Turn a vague line into specific evidence.",
      body: (
        <>
          <p className="text-xs text-muted-foreground line-through">Worked on a data project.</p>
          <div className="mt-3 border-l-2 border-primary pl-3">
            <p className="text-xs font-semibold text-primary">Suggested for review</p>
            <p className="mt-2 text-sm leading-6">Created a SQL reporting dashboard for a coursework project.</p>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            <FileText className="mr-1 inline h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Uses only the facts supplied in this illustration.
          </p>
        </>
      ),
      note: "Suggested for review — you approve every change.",
    },
    interview: {
      cue: "Practice stays tied to this role.",
      body: (
        <>
          <p className="text-sm font-medium">How did you use SQL to turn coursework data into a clear dashboard?</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            The question uses the same requirement and evidence, so your practice stays focused on this role.
          </p>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            <Mic2 className="mr-1 inline h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Practice guidance is not an employer assessment.
          </p>
        </>
      ),
      note: "Interview prompts remain guidance you can inspect.",
    },
    action: {
      cue: "Leave yourself one clear task.",
      body: (
        <>
          <div className="border-y border-border py-3">
            <p className="text-xs font-semibold text-primary">Set by you</p>
            <p className="mt-1 text-sm font-semibold">Check whether the role needs AWS evidence before applying</p>
            <p className="mt-1 text-xs text-muted-foreground">No due date set</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Your next action stays connected to the Graduate Data Analyst application.
          </p>
        </>
      ),
      note: "Set the next task and due date yourself.",
    },
    outcome: {
      cue: "Track what actually happened.",
      body: (
        <>
          <p className="text-sm leading-6 text-muted-foreground">
            No outcome is set in this illustration. You record an application, interview or offer outcome yourself; Syncareer does not infer one.
          </p>
          <p className="mt-3 text-xs font-semibold text-muted-foreground">No outcome recorded</p>
        </>
      ),
      note: "Record what actually happened — not a guess.",
    },
  };

  const content = bodies[stage.id];
  if (!content) return null;

  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        <p className="eyebrow text-primary">{stage.label}</p>
        <h4 className="mt-1 text-base font-semibold tracking-[-0.015em]">{content.cue}</h4>
        <div className="mt-3">{content.body}</div>
        {content.note && (
          <div className="mt-4 flex items-start gap-2 border-t pt-3 text-xs leading-5 text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
            {content.note}
          </div>
        )}
      </div>
      <p className="mt-6 text-[11px] leading-5 text-muted-foreground">
        Illustrative product state — not a live listing or user record.
      </p>
    </div>
  );
}

const JOURNEY_HEADING = "See the whole application, one stage at a time.";
const JOURNEY_SUB = "Scroll through each stage to inspect it in the application workspace. The same role stays connected across all six steps.";

export default function ScrollStory() {
  const [activeStage, setActiveStage] = useState<string>("opportunity");

  const handleStageActivate = (stageId: string) => {
    setActiveStage(stageId);
    const panel = document.getElementById(`story-panel-${stageId}`);
    panel?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const openStage = (stageId: string) => {
    const control = document.getElementById(`story-record-tab-${stageId}`);
    control?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "center",
    });
    control?.focus();
    control?.click();
    setActiveStage(stageId);
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
      {/* Section 1: Six connected workflow stages */}
      <AnimatedSection>
        <section id="workflow" className="scroll-mt-24 border-b bg-card" aria-labelledby="workflow-title">
          <div className="mx-auto grid gap-16 py-16 sm:gap-20 lg:py-24 lg:grid-cols-[0.65fr_1fr]">
            <div className="max-w-2xl">
              <p className="brand-eyebrow">One role, six connected steps</p>
              <h2 id="workflow-title" className="mt-4 text-balance text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                {JOURNEY_HEADING}
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground">{JOURNEY_SUB}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {APPLICATION_STAGES.map((stage) => (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => openStage(stage.id)}
                    className="group inline-flex items-center gap-2 rounded-control border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors duration-150 hover:border-primary/40 hover:bg-primary/5 hover:text-primary motion-reduce:transition-none"
                  >
                    <span className="text-[10px] opacity-60">{APPLICATION_STAGES.indexOf(stage) + 1}</span>
                    {stage.label}
                    <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {APPLICATION_STAGES.map((stage, index) => (
                <StagePanel
                  key={stage.id}
                  stage={stage}
                  index={index}
                  isActive={activeStage === stage.id}
                  onActivate={handleStageActivate}
                />
              ))}
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* Section 2: The same record, every stage — anchored application record */}
      <div className="mx-auto grid gap-12 lg:grid-cols-[0.4fr_1fr] lg:gap-16">
        <AnimatedSection delay={0.02}>
          <div className="border-t border-border bg-secondary/35 py-12 sm:border-t-0 sm:pt-0 sm:py-0 lg:pt-0 lg:border-t-0 lg:py-0 lg:col-span-1">
            <p className="brand-eyebrow">Try it in the workspace</p>
            <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em]">The same record, every stage</h3>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              The application record below is a single illustrative Syncareer workspace. Select any stage tab to switch the panel without losing the role, requirements or evidence you already set.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
              One role · 3 requirements · 2 supported · 1 gap
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.04}>
          <div className="rounded-surface border border-border bg-card shadow-[0_28px_70px_-42px_hsl(var(--foreground)/0.38)] lg:col-span-2 lg:border-l lg:border-l-0">
            <ApplicationRecord
              idPrefix="story-record"
              className="rounded-none sm:rounded-surface"
              onStageChange={(stage) => setActiveStage(stage)}
            />
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
