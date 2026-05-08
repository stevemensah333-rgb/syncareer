import AnimatedSection from "./AnimatedSection";

const stats = [
  { value: "2,400+", label: "Assessments taken" },
  { value: "12+", label: "Partner universities" },
  { value: "94%", label: "Completion rate" },
];

export default function IntroStatsSection() {
  return (
    <section className="relative py-24 md:py-32">
      <div className="container mx-auto px-6 max-w-6xl">
        <AnimatedSection>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/50 mb-5">
            About Syncareer
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 gap-10 md:gap-20 items-start">
          <AnimatedSection>
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-foreground tracking-[-0.01em]">
              For students who want a real career, <em>not a guess.</em>
            </h2>
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <p className="text-base md:text-lg text-foreground/65 leading-relaxed max-w-md">
              Syncareer combines a research-backed RIASEC assessment, an AI CV
              builder tuned for African graduate markets, and voice-based
              interview practice. Every recommendation is explainable. Every
              score is actionable.
            </p>
          </AnimatedSection>
        </div>

        <AnimatedSection delay={0.2}>
          <div className="mt-20 grid grid-cols-3 gap-4 md:gap-12 border-t border-foreground/10 pt-12">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="font-serif text-4xl md:text-6xl text-foreground tracking-[-0.02em] leading-none">
                  {s.value}
                </div>
                <div className="mt-3 text-xs md:text-sm text-foreground/55">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
