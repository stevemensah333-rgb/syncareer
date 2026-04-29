import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import AnimatedSection from "./AnimatedSection";

export default function FinalCTASection() {
  const navigate = useNavigate();

  return (
    <section className="bg-background py-20 md:py-28 border-t border-border">
      <div className="container mx-auto px-6 max-w-5xl">
        <AnimatedSection>
          <div
            className="relative overflow-hidden rounded-2xl border border-border bg-card p-10 md:p-16 text-center"
            style={{
              backgroundImage:
                "radial-gradient(80% 100% at 50% 0%, hsl(var(--primary) / 0.10) 0%, transparent 70%)",
            }}
          >
            <h2 className="text-3xl md:text-5xl font-semibold leading-tight text-foreground tracking-tight max-w-2xl mx-auto">
              Start your career journey today.
            </h2>
            <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
              Join thousands of students using Syncareer to discover, prepare for, and land their first role.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => navigate('/assessment')}
                className="group inline-flex items-center gap-2 rounded-lg px-5 h-11 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
              >
                Take the free assessment
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <button
                onClick={() => navigate('/pricing')}
                className="inline-flex items-center rounded-lg px-5 h-11 text-sm font-medium bg-card text-foreground border border-border hover:bg-muted transition-colors"
              >
                See pricing
              </button>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
