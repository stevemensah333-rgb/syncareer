import AnimatedSection from "./AnimatedSection";

const STEPS = [
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
    <section id="how" className="relative py-24 lg:py-32 bg-[#f7f5ef] text-[#0a1512]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <AnimatedSection>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#009ba1]">
            How it works
          </p>
          <div className="mt-3 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight max-w-2xl leading-[1.05]">
              Reach your goals in four steps.
            </h2>
            <p className="text-lg text-[#0a1512]/70 max-w-md leading-relaxed">
              Every step produces something you can act on the same day, not just
              a box you check.
            </p>
          </div>
        </AnimatedSection>

        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((step, i) => (
            <AnimatedSection key={step.n} delay={i * 0.08}>
              <div className="group rounded-2xl border border-black/8 bg-white p-7 h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_25px_50px_-20px_rgba(0,0,0,0.15)]">
                <div
                  aria-hidden
                  className="text-5xl font-semibold tracking-tight text-[#00c4cc]"
                >
                  {step.n}
                </div>
                <h3 className="mt-6 text-xl font-semibold tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-3 text-[15px] text-[#0a1512]/70 leading-relaxed">
                  {step.body}
                </p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
