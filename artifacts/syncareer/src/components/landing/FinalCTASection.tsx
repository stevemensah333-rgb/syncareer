import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import AnimatedSection from "./AnimatedSection";

export default function FinalCTASection() {
  const navigate = useNavigate();

  return (
    <section className="relative py-24 md:py-36">
      <div className="container mx-auto px-6 max-w-4xl text-center">
        <AnimatedSection>
          <h2 className="font-sans text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.05] text-foreground tracking-tight">
            Start your career journey today.
          </h2>
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Join thousands of students using Syncareer to discover, prepare for,
            and land their first role.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.2}>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => navigate("/assessment")}
              className="group inline-flex items-center gap-2 rounded-full px-6 h-12 text-sm font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors shadow-sm"
            >
              Take the free assessment
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              onClick={() => navigate("/pricing")}
              className="inline-flex items-center rounded-full px-6 h-12 text-sm font-medium bg-white/85 backdrop-blur text-foreground hover:bg-white transition-colors ring-1 ring-black/[0.06]"
            >
              See pricing
            </button>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
