import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FinalCTASectionProps {
  onGetStarted: () => void;
  onAssessment: () => void;
}

export default function FinalCTASection({ onGetStarted, onAssessment }: FinalCTASectionProps) {
  return (
    <section className="bg-foreground text-background" aria-labelledby="final-cta-title">
      <div className="mx-auto grid w-full max-w-[1280px] gap-6 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto] md:items-center lg:px-8 lg:py-12">
        <div className="max-w-2xl">
          <h2 id="final-cta-title" className="text-balance text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
            Start with an opportunity worth pursuing.
          </h2>
          <p className="mt-2 text-sm leading-6 text-background/70 sm:text-base">
            Explore real external listings, then build a stronger application from evidence you can support.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center md:flex-col md:items-stretch">
          <Button size="lg" onClick={onGetStarted} className="min-h-12 gap-2">
            Explore opportunities <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <button type="button" onClick={onAssessment} className="min-h-11 px-2 text-sm font-medium text-background/70 underline-offset-4 hover:text-background hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background">Not sure what fits? Take the assessment</button>
        </div>
      </div>
    </section>
  );
}
