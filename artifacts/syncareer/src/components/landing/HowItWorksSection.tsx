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

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative py-24 md:py-32">
      <div className="container mx-auto px-6 max-w-6xl">
        <AnimatedSection className="max-w-2xl mb-16 md:mb-20">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/50 mb-5">
            How it works
          </p>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-foreground tracking-[-0.01em]">
            Reach your goals in <em>four steps.</em>
          </h2>
        </AnimatedSection>

        {/* Editorial pinned list: oversized numerals on the left stay sticky
            while the prose on the right scrolls past. */}
        <div className="grid lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] gap-10 lg:gap-20">
          {/* Sticky numeral column */}
          <div className="hidden lg:block">
            <div className="sticky top-32 space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/50 mb-6">
                Four chapters
              </p>
              <p className="font-serif text-foreground/30 text-6xl leading-none">
                The journey
              </p>
            </div>
          </div>

          {/* Step list — each row is tall enough that the numeral column
              feels pinned while you scroll through. */}
          <div>
            {steps.map((s, i) => (
              <AnimatedSection
                key={s.n}
                delay={i * 0.05}
                className="border-t border-foreground/10 first:border-t-0"
              >
                <div className="grid grid-cols-[auto_1fr] gap-6 md:gap-10 py-10 md:py-14">
                  <div className="font-serif text-foreground/25 text-5xl md:text-7xl leading-none tabular-nums">
                    {s.n}
                  </div>
                  <div className="pt-1 md:pt-3">
                    <h3 className="font-serif text-2xl md:text-3xl text-foreground mb-3 leading-tight">
                      {s.title}
                    </h3>
                    <p className="text-base text-foreground/65 leading-relaxed max-w-lg">
                      {s.body}
                    </p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
