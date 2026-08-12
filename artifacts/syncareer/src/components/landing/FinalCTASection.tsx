import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FinalCTASectionProps {
  onGetStarted: () => void;
  onAssessment: () => void;
}

export default function FinalCTASection({ onGetStarted, onAssessment }: FinalCTASectionProps) {
  return (
    <section className="border-t bg-secondary text-secondary-foreground" aria-labelledby="final-cta-title">
      <div className="mx-auto grid w-full max-w-[1280px] gap-8 px-4 py-16 sm:px-6 md:grid-cols-[1fr_auto] md:items-end lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          <p className="eyebrow text-secondary-foreground/65">Close the loop</p>
          <h2 id="final-cta-title" className="mt-3 text-balance text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
            Your application should have a memory.
          </h2>
          <div className="mt-5 grid grid-cols-3 border-y border-secondary-foreground/15 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-secondary-foreground/75 sm:grid-cols-6">
            <span>Role</span><span>Evidence</span><span>CV</span><span>Practice</span><span>Action</span><span>Outcome</span>
          </div>
          <p className="mt-4 text-sm leading-6 text-secondary-foreground/70 sm:text-base">
            Start with an opportunity worth pursuing, then keep the source, evidence, preparation, and decisions connected as the record changes.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
          <Button size="lg" onClick={onGetStarted} className="min-h-12 gap-2">
            Explore opportunities <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button size="lg" variant="outline" onClick={onAssessment} className="min-h-12 border-secondary-foreground/25 bg-transparent text-secondary-foreground hover:bg-secondary-foreground/10 hover:text-secondary-foreground">
            Take the assessment
          </Button>
        </div>
      </div>
    </section>
  );
}
