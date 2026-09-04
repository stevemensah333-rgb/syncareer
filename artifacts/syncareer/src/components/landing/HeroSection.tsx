import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import ApplicationRecord, { APPLICATION_STAGES } from "./ApplicationRecord";

interface HeroSectionProps {
  onGetStarted: () => void;
  onAssessment: () => void;
}

/**
 * Journey stages shown in the hero flow strip. These map to the six
 * ApplicationRecord tabs but are presented as a connected journey rather
 * than a tablist, so visitors understand the relationship between stages
 * before they interact with the demo.
 */
const HERO_JOURNEY = [
  { id: "opportunity", label: "Opportunity", short: "Find it" },
  { id: "evidence", label: "Evidence", short: "Prove it" },
  { id: "cv", label: "CV", short: "Build it" },
  { id: "interview", label: "Interview", short: "Practice it" },
  { id: "action", label: "Next action", short: "Plan it" },
  { id: "outcome", label: "Outcome", short: "Track it" },
] as const;

export default function HeroSection({ onGetStarted, onAssessment }: HeroSectionProps) {
  const handleTryDemo = () => {
    const evidenceTab = document.getElementById("hero-record-tab-evidence");
    evidenceTab?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "nearest",
    });
    evidenceTab?.focus();
    evidenceTab?.click();
  };

  return (
    <section className="landing-hero relative overflow-hidden border-b" aria-labelledby="landing-hero-title">
      <div className="landing-hero-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-[1440px] px-4 pb-14 pt-12 sm:px-6 md:py-16 lg:px-8 lg:pb-28 lg:pt-20">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start lg:gap-8 xl:gap-12">
          {/* Left column — copy, journey sequence, CTAs */}
          <div className="relative z-10 min-w-0 max-w-xl lg:col-span-5 lg:pt-10">
            <p className="brand-eyebrow">For African students and recent graduates</p>

            <h1
              id="landing-hero-title"
              className="type-display mt-5 text-balance text-[2.6rem] leading-[1.03] sm:text-[3.1rem] lg:text-[3.75rem]"
            >
              Know what your application needs—and{" "}
              <span className="text-primary">what to do next.</span>
            </h1>

            <p className="mt-6 max-w-lg text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Save a real opportunity, connect its requirements to evidence from your experience, improve your CV, practise for the interview and keep track of what happens next.
            </p>

            {/* DISCOVER → PROVE → ADVANCE journey sequence */}
            <div className="mt-8" role="list" aria-label="Application journey: Discover, Prove, Advance">
              <div
                tabIndex={0}
                className="flex items-stretch gap-2 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:gap-3 lg:overflow-visible lg:pb-0"
              >
                {HERO_JOURNEY.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-2 snap-start lg:gap-3" role="listitem">
                    <div className="group flex min-w-[120px] flex-col items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2.5 transition-[border-color,background-color] duration-150 hover:border-primary/30 hover:bg-primary/[0.04] motion-reduce:transition-none lg:min-w-0 lg:px-4 lg:py-3">
                      <span className="text-xs font-semibold text-primary uppercase tracking-wider transition-colors duration-150 group-hover:text-primary-hover">{step.label}</span>
                      <span className="text-[11px] leading-tight text-muted-foreground text-center max-w-[130px] sm:max-w-[110px]">{step.short}</span>
                    </div>
                    {index < HERO_JOURNEY.length - 1 && (
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40" aria-hidden="true" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Button size="lg" onClick={onGetStarted} className="min-h-12 w-full gap-2 px-6 text-base sm:w-auto">
                Explore opportunities <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button size="lg" variant="outline" onClick={handleTryDemo} className="min-h-12 w-full gap-2 px-6 sm:w-auto">
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                Inspect how it works
              </Button>
            </div>

            <button
              type="button"
              onClick={onAssessment}
              className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-muted-foreground underline-offset-4 transition-colors duration-150 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Not sure what fits? Take the assessment →
            </button>

            <p className="mt-8 flex max-w-lg items-start gap-2 border-t pt-6 text-sm leading-6 text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
              External opportunities keep their original source links.
            </p>

            <p className="mt-3 flex max-w-lg items-start gap-2 text-sm leading-6 text-muted-foreground">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              Free for students and recent graduates — no subscription or paid tier, and every
              feature is available to every user.
            </p>
          </div>

          {/* Right column — real product UI: the application record */}
          <div id="hero-interactive-demo" className="relative min-w-0 w-full lg:col-span-7 lg:translate-y-4 xl:-mr-8">
            <p className="mb-3 hidden items-center gap-2 text-xs font-medium text-muted-foreground lg:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
              A live look at one application record — {APPLICATION_STAGES.length} connected steps
            </p>
            <ApplicationRecord idPrefix="hero-record" className="rounded-none sm:rounded-surface" />
          </div>
        </div>
      </div>
    </section>
  );
}
