import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  onGetStarted: () => void;
  onAssessment: () => void;
}

export default function HeroSection({
  onGetStarted,
  onAssessment,
}: HeroSectionProps) {
  return (
    <section
      className="relative overflow-hidden border-b"
      aria-labelledby="landing-hero-title"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_75%_10%,hsl(var(--primary)/0.10),transparent_38%)]"
      />
      <div className="mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-6 md:py-24 lg:px-8 lg:py-28">
        <div className="max-w-4xl">
          <p className="text-sm font-semibold text-primary">
            For African students and recent graduates
          </p>
          <h1
            id="landing-hero-title"
            className="mt-4 max-w-4xl text-balance text-[2.65rem] font-semibold leading-[1.03] tracking-[-0.045em] sm:text-5xl md:text-6xl"
          >
            Turn a real opportunity into a stronger, evidence-based application.
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Keep the role, truthful CV evidence, interview preparation, next
            action, and eventual outcome connected in one working application
            journey.
          </p>
          <div className="mt-8 flex flex-col gap-2 sm:flex-row">
            <Button
              size="lg"
              onClick={onGetStarted}
              className="min-h-12 w-full gap-2 px-6 sm:w-auto"
            >
              Explore opportunities{" "}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={onAssessment}
              className="min-h-12 w-full px-6 sm:w-auto"
            >
              Not sure what fits? Take the assessment
            </Button>
          </div>
          <p className="mt-7 flex max-w-2xl items-start gap-2 text-sm leading-6 text-muted-foreground">
            <CheckCircle2
              className="mt-1 h-4 w-4 shrink-0 text-success"
              aria-hidden="true"
            />
            External listings retain their source labels. Syncareer does not
            claim that they are independently verified or guarantee an
            application outcome.
          </p>
        </div>
      </div>
    </section>
  );
}
