import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimatedSection from "./AnimatedSection";

interface FinalCTASectionProps {
  onGetStarted: () => void;
  onAssessment: () => void;
}

export default function FinalCTASection({ onGetStarted, onAssessment }: FinalCTASectionProps) {
  return (
    <AnimatedSection>
      <section className="relative overflow-hidden bg-foreground text-background" aria-labelledby="final-cta-title">
        <div
          className="public-grid pointer-events-none absolute inset-0 opacity-[0.06]"
          aria-hidden="true"
        />
        <div className="relative mx-auto grid w-full max-w-[1280px] gap-8 px-4 py-16 sm:px-6 md:grid-cols-[1fr_auto] md:items-center lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-background/70">
              <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
              Ready when you are
            </p>
            <h2 id="final-cta-title" className="mt-4 text-balance text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              Start with an opportunity worth pursuing.
            </h2>
            <p className="mt-3 max-w-xl text-base leading-7 text-background/70">
              Explore real external listings, then build a stronger application from evidence you can support.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center md:flex-col md:items-stretch">
            <Button size="lg" onClick={onGetStarted} className="min-h-12 gap-2 px-6 text-base">
              Explore opportunities <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <button
              type="button"
              onClick={onAssessment}
              className="min-h-11 px-2 text-sm font-medium text-background/70 underline-offset-4 hover:text-background hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background"
            >
              Not sure what fits? Take the assessment
            </button>
          </div>
        </div>
      </section>
    </AnimatedSection>
  );
}
