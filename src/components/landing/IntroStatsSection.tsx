import AnimatedSection from "./AnimatedSection";

const stats = [
  { value: "2,400+", label: "Assessments taken" },
  { value: "12+", label: "Partner universities" },
  { value: "94%", label: "Completion rate" },
];

export default function IntroStatsSection() {
  return (
    <section className="bg-background py-20 md:py-28 border-t border-border">
      <div className="container mx-auto px-6 max-w-6xl">
        <AnimatedSection>
          <p className="text-xs font-medium uppercase tracking-wider text-primary mb-4">About</p>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-start">
          <AnimatedSection>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight text-foreground tracking-tight">
              Built for students who want a real career, not a guess.
            </h2>
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              Syncareer combines a research-backed RIASEC assessment, an AI CV builder
              tuned for African graduate markets, and voice-based interview practice.
              Every recommendation is explainable. Every score is actionable.
            </p>
          </AnimatedSection>
        </div>

        <AnimatedSection delay={0.2}>
          <div className="mt-16 grid grid-cols-3 gap-4 md:gap-8 border-t border-border pt-10">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-3xl md:text-5xl font-semibold text-foreground tracking-tight">{s.value}</div>
                <div className="mt-2 text-xs md:text-sm text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
