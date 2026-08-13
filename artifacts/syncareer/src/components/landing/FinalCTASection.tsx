import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FinalCTASectionProps {
  onGetStarted: () => void;
  onAssessment: () => void;
}

const recordStages = ["Role", "Evidence", "CV", "Practice", "Action", "Outcome"];

export default function FinalCTASection({ onGetStarted, onAssessment }: FinalCTASectionProps) {
  return (
    <section className="relative overflow-hidden border-t border-white/10 bg-[hsl(222_36%_13%)] text-white" aria-labelledby="final-cta-title">
      <div aria-hidden="true" className="absolute bottom-[14%] right-[9%] top-[12%] hidden w-3 bg-primary/85 lg:block" />
      <div className="relative mx-auto grid w-full max-w-[1280px] gap-10 px-4 py-20 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end lg:px-8 lg:py-28">
        <div className="max-w-3xl">
          <p className="eyebrow text-white/60">Application memory / the record continues</p>
          <h2 id="final-cta-title" className="mt-3 text-balance text-4xl font-semibold tracking-[-0.05em] sm:text-5xl lg:text-6xl">
            An application should not disappear after you click Apply.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg sm:leading-8">
            Keep the role, evidence, preparation, next action, and eventual outcome connected in one place—so the work remains useful after the application changes hands.
          </p>
          <div className="mt-8 grid grid-cols-2 border-y border-white/15 text-xs font-semibold uppercase tracking-[0.1em] text-white/75 sm:grid-cols-3 lg:grid-cols-6">
            {recordStages.map((stage, index) => (
              <span key={stage} className={`flex min-h-12 items-center gap-2 px-3 ${index < recordStages.length - 1 ? "border-b border-white/10 sm:border-b-0 lg:border-r" : ""} ${index === 3 ? "sm:border-b-0" : ""}`}>
                <span className="font-mono text-[10px] text-primary">0{index + 1}</span>
                {stage}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row md:flex-col md:pb-1">
          <Button size="lg" onClick={onGetStarted} className="group min-h-12 gap-2 px-6 shadow-[0_12px_28px_-16px_hsl(var(--primary)/0.85)] transition-[background-color,transform,box-shadow] duration-150 hover:-translate-y-px hover:shadow-[0_16px_30px_-16px_hsl(var(--primary)/0.9)] active:translate-y-0 active:scale-[0.98] motion-reduce:transform-none">
            Explore opportunities <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
          </Button>
          <Button size="lg" variant="outline" onClick={onAssessment} className="min-h-12 border-white/30 bg-transparent text-white transition-[background-color,border-color,transform] duration-150 hover:translate-x-0.5 hover:border-white/60 hover:bg-white/10 hover:text-white active:translate-x-0 active:scale-[0.98] motion-reduce:transform-none">
            Take the assessment
          </Button>
        </div>
      </div>
    </section>
  );
}
