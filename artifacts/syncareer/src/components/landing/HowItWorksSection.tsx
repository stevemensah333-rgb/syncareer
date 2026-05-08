import AnimatedSection from "./AnimatedSection";

const steps = [
  {
    n: "01",
    title: "Assess",
    body: "A 5-minute, research-backed RIASEC and skills diagnostic. We map your strengths to the careers most likely to fit you — and tell you why.",
  },
  {
    n: "02",
    title: "Build your CV",
    body: "An ATS-friendly CV with quantified achievements, generated in minutes and tuned for African graduate hiring filters.",
  },
  {
    n: "03",
    title: "Practice",
    body: "Voice interviews with SynAssist. Role-specific questions, structured feedback, and a quiet space to rehearse without judgement.",
  },
  {
    n: "04",
    title: "Apply",
    body: "Real openings from Ghana and beyond, all tracked in one calm dashboard so nothing slips between the cracks.",
  },
];

/**
 * Editorial four-step section. Each step occupies a tall row; its numeral
 * uses `position: sticky` so it pins to the viewport while the prose
 * scrolls past, then releases as the next step takes over. Pure CSS — no
 * scroll-jacking library.
 */
export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative py-24 md:py-32">
      <div className="container mx-auto px-6 max-w-6xl">
        <AnimatedSection className="max-w-2xl mb-16 md:mb-20">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/50 mb-5">
            How it works
          </p>
          <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-semibold leading-[1.1] text-foreground tracking-tight">
            Reach your goals in four steps.
          </h2>
        </AnimatedSection>

        {/* Each step is a tall row with a sticky numeral column on the left */}
        <div>
          {steps.map((s, i) => (
            <div
              key={s.n}
              className="relative grid grid-cols-[auto_1fr] gap-6 md:gap-12 border-t border-foreground/10 first:border-t-0 lg:min-h-[60vh] py-10 md:py-16"
            >
              {/* Sticky oversized serif numeral — per the brief */}
              <div className="self-start lg:sticky lg:top-32">
                <div className="font-serif text-foreground/25 text-6xl md:text-8xl lg:text-9xl leading-none tabular-nums">
                  {s.n}
                </div>
              </div>

              <AnimatedSection delay={i * 0.04} className="self-center">
                <div className="max-w-xl">
                  <h3 className="font-sans text-2xl md:text-3xl font-semibold text-foreground mb-4 leading-tight tracking-tight">
                    {s.title}
                  </h3>
                  <p className="text-base md:text-lg text-foreground/65 leading-relaxed">
                    {s.body}
                  </p>
                </div>
              </AnimatedSection>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
