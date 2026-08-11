import { ArrowRight, CheckCircle2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductDemo from "./ProductDemo";

interface HeroSectionProps {
  onGetStarted: () => void;
  onAssessment: () => void;
}

export default function HeroSection({
  onGetStarted,
  onAssessment,
}: HeroSectionProps) {
  const handleTryDemo = () => {
    const nextTab =
      document.getElementById("demo-tab-evidence") ||
      document.getElementById("demo-tab-opportunity");
    if (nextTab) {
      nextTab.scrollIntoView({ behavior: "smooth", block: "nearest" });
      nextTab.focus();
      nextTab.click();
    }
  };

  return (
    <section
      className="relative overflow-hidden border-b"
      aria-labelledby="landing-hero-title"
    >
      <div className="mx-auto w-full max-w-[1400px] px-4 py-12 sm:px-6 md:py-16 lg:px-8 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-start lg:gap-10 xl:gap-14">
          <div className="max-w-2xl lg:col-span-6 xl:col-span-6">
            <p className="text-sm font-semibold text-primary">
              For African students and recent graduates
            </p>
            <h1
              id="landing-hero-title"
              className="mt-4 text-balance text-3xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-4xl md:text-5xl lg:text-[3.15rem]"
            >
              Stop guessing what an application is missing. Turn a real opportunity into a stronger, evidence-based application.
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Keep the role, truthful CV evidence, interview preparation, next
              action, and eventual outcome connected in one working application
              journey.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                size="lg"
                onClick={onGetStarted}
                className="min-h-12 w-full gap-2 px-6 transition-colors duration-150 ease-out sm:w-auto"
              >
                Explore opportunities{" "}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleTryDemo}
                className="min-h-12 w-full gap-2 px-6 transition-colors duration-150 ease-out sm:w-auto"
              >
                <Play className="h-3.5 w-3.5 fill-current opacity-70" aria-hidden="true" />
                Try the interactive demo
              </Button>
            </div>
            <div className="mt-3">
              <button
                type="button"
                onClick={onAssessment}
                className="text-sm font-medium text-muted-foreground underline-offset-4 transition-colors duration-150 ease-out hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Not sure what fits? Take the assessment →
              </button>
            </div>
            <p className="mt-7 flex max-w-xl items-start gap-2 text-sm leading-6 text-muted-foreground">
              <CheckCircle2
                className="mt-1 h-4 w-4 shrink-0 text-success"
                aria-hidden="true"
              />
              External listings retain their source labels. Syncareer does not
              claim that they are independently verified or guarantee an
              application outcome.
            </p>
          </div>
          <div id="hero-interactive-demo" className="w-full lg:col-span-6 xl:col-span-6">
            <ProductDemo />
          </div>
        </div>
      </div>
    </section>
  );
}
