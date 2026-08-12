import { ArrowRight, CheckCircle2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import ApplicationRecord from "./ApplicationRecord";

interface HeroSectionProps {
  onGetStarted: () => void;
  onAssessment: () => void;
}

export default function HeroSection({ onGetStarted, onAssessment }: HeroSectionProps) {
  const handleTryDemo = () => {
    const evidenceTab = document.getElementById("hero-record-tab-evidence");
    evidenceTab?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    evidenceTab?.focus();
    evidenceTab?.click();
  };

  return (
    <section className="relative overflow-hidden border-b" aria-labelledby="landing-hero-title">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-6 md:py-14 lg:px-8 lg:py-20">
        <div className="grid gap-9 lg:grid-cols-12 lg:items-center lg:gap-10 xl:gap-14">
          <div className="max-w-xl lg:col-span-5">
            <p className="eyebrow text-primary">For African students and recent graduates</p>
            <h1 id="landing-hero-title" className="mt-4 text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.055em] sm:text-5xl lg:text-[3.6rem]">
              Stop guessing what an application is missing.
            </h1>
            <p className="mt-5 max-w-lg text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Turn a real opportunity into a working record: source, evidence, CV preparation, interview practice, next action, and outcome.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Button size="lg" onClick={onGetStarted} className="min-h-12 w-full gap-2 px-6 sm:w-auto">
                Explore opportunities <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button size="lg" variant="outline" onClick={handleTryDemo} className="min-h-12 w-full gap-2 px-6 sm:w-auto">
                <Play className="h-3.5 w-3.5 fill-current opacity-70" aria-hidden="true" />
                Inspect the record
              </Button>
            </div>
            <button type="button" onClick={onAssessment} className="mt-4 text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Not sure what fits? Take the assessment →
            </button>
            <p className="mt-7 flex max-w-lg items-start gap-2 text-sm leading-6 text-muted-foreground">
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
              External listings retain source labels. Syncareer does not claim independent verification or guarantee an application outcome.
            </p>
          </div>
          <div id="hero-interactive-demo" className="w-full lg:col-span-7">
            <ApplicationRecord autoProgress idPrefix="hero-record" className="rounded-none sm:rounded-sm" />
          </div>
        </div>
      </div>
    </section>
  );
}
