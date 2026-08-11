import { ArrowRight, BriefcaseBusiness, FileCheck2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FinalCTASectionProps {
  onGetStarted: () => void;
  onAssessment: () => void;
}

export default function FinalCTASection({ onGetStarted, onAssessment }: FinalCTASectionProps) {
  return (
    <section className="bg-card" aria-labelledby="final-cta-title">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-20 sm:px-6 md:py-24 lg:px-8">
        <div className="overflow-hidden rounded-2xl border border-primary/20 bg-primary/[0.055] px-6 py-12 sm:px-10 sm:py-14 lg:px-14">
          <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Your next application</p>
              <h2 id="final-cta-title" className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl lg:text-5xl">
                Start with the opportunity. Build the evidence from there.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Create a workspace for the roles you care about, improve the material you submit,
                prepare with the right context, and keep an honest record of what happens next.
              </p>
              <ul className="mt-7 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-6">
                <li className="flex items-center gap-2">
                  <BriefcaseBusiness className="h-4 w-4 text-primary" aria-hidden="true" /> Real opportunity context
                </li>
                <li className="flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-success" aria-hidden="true" /> Evidence-first CV guidance
                </li>
                <li className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-info" aria-hidden="true" /> Job-specific preparation
                </li>
              </ul>
            </div>
            <div className="flex flex-col gap-2"><Button size="lg" onClick={onGetStarted} className="min-h-12 w-full gap-2 px-6 sm:w-auto">Explore opportunities<ArrowRight className="h-4 w-4" aria-hidden="true" /></Button><Button variant="outline" onClick={onAssessment}>Still choosing? Explore interests</Button></div>
          </div>
        </div>
      </div>
    </section>
  );
}
