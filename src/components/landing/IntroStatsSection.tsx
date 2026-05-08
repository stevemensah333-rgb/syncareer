import AnimatedSection from "./AnimatedSection";

const stats = [
  { value: "2,400+", label: "Assessments Taken" },
  { value: "12+", label: "Universities" },
  { value: "94%", label: "Completion Rate" },
];

export default function IntroStatsSection() {
  return (
    <section className="bg-landing-cream py-24 md:py-32">
      <div className="container mx-auto px-6 max-w-6xl">
        <AnimatedSection>
          <p className="text-xs uppercase tracking-[0.3em] text-landing-ink/50 mb-8">About</p>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-start">
          <AnimatedSection>
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-landing-ink tracking-tight">
              Built for students who want a real career, not a guess.
            </h2>
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <p className="text-base md:text-lg text-landing-ink/70 leading-relaxed">
              Syncareer combines a research-backed RIASEC assessment, an AI CV builder
              tuned for African graduate markets, and voice-based interview practice.
              Every recommendation is explainable. Every score is actionable. No fluff,
              no generic advice — just the tools you need to land your first role with confidence.
            </p>
          </AnimatedSection>
        </div>

        <AnimatedSection delay={0.2}>
          <div className="mt-16 md:mt-24 grid grid-cols-3 gap-4 md:gap-10 border-t border-landing-ink/10 pt-12">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-serif text-5xl md:text-7xl text-landing-amber leading-none">{s.value}</div>
                <div className="mt-3 text-xs uppercase tracking-[0.2em] text-landing-ink/60">{s.label}</div>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
