import { ArrowDown, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ApplicationRecord from "./ApplicationRecord";

interface HeroSectionProps {
  onGetStarted: () => void;
  onAssessment: () => void;
}

export default function HeroSection({ onGetStarted, onAssessment }: HeroSectionProps) {
  const handleTryDemo = () => {
    const evidenceTab = document.getElementById("hero-record-tab-evidence");
    evidenceTab?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
    evidenceTab?.focus();
    evidenceTab?.click();
  };

  return (
    <section className="landing-hero relative overflow-hidden border-b" aria-labelledby="landing-hero-title">
      <div className="landing-hero-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-[1440px] px-4 pb-12 pt-10 sm:px-6 md:py-14 lg:px-8 lg:pb-24 lg:pt-16">
        <div className="grid gap-9 lg:grid-cols-12 lg:items-start lg:gap-8 xl:gap-12">
          <div className="relative z-10 min-w-0 max-w-xl lg:col-span-5 lg:pt-12">
            <p className="type-label text-primary">For African students and recent graduates</p>
            <h1 id="landing-hero-title" className="type-display mt-4 text-balance lg:text-[3.6rem]">
              Know what your application needs—and what to do next.
            </h1>
            <p className="mt-5 max-w-lg text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Save a real opportunity, connect its requirements to evidence from your experience, improve your CV, practise for the interview and keep track of what happens next.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Button size="lg" onClick={onGetStarted} className="min-h-12 w-full gap-2 px-6 sm:w-auto">
                Explore opportunities <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button size="lg" variant="outline" onClick={handleTryDemo} className="min-h-12 w-full gap-2 px-6 sm:w-auto">
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
                Inspect how it works
              </Button>
            </div>
            <button type="button" onClick={onAssessment} className="mt-4 text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Not sure what fits? Take the assessment →
            </button>
            <p className="mt-7 flex max-w-lg items-start gap-2 text-sm leading-6 text-muted-foreground">
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
              External opportunities keep their original source links.
            </p>
          </div>
          <div id="hero-interactive-demo" className="relative min-w-0 w-full lg:col-span-7 lg:translate-y-6 xl:-mr-8">
            <ApplicationRecord idPrefix="hero-record" className="rounded-none sm:rounded-surface" />
          </div>
        </div>
      </div>
    </section>
  );
}
