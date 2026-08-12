import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FinalCTASectionProps {
  onGetStarted: () => void;
  onAssessment: () => void;
}

export default function FinalCTASection({
  onGetStarted,
  onAssessment,
}: FinalCTASectionProps) {
  return (
    <section
      className="bg-secondary text-secondary-foreground"
      aria-labelledby="final-cta-title"
    >
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-7 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="max-w-2xl">
          <h2
            id="final-cta-title"
            className="text-balance text-3xl font-semibold tracking-[-0.035em]"
          >
            Your application should have a memory.
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-secondary-foreground/75">
            <span>Role</span><span aria-hidden="true">→</span><span>Evidence</span><span aria-hidden="true">→</span><span>Preparation</span><span aria-hidden="true">→</span><span>Action</span><span aria-hidden="true">→</span><span>Outcome</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-secondary-foreground/70 sm:text-base">
            Start with an opportunity worth pursuing, then keep the decisions and evidence connected as the application changes.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button size="lg" onClick={onGetStarted} className="min-h-12 gap-2">
            Explore opportunities <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={onAssessment}
            className="min-h-12 border-secondary-foreground/25 bg-transparent text-secondary-foreground hover:bg-secondary-foreground/10 hover:text-secondary-foreground"
          >
            Take the assessment
          </Button>
        </div>
      </div>
    </section>
  );
}
