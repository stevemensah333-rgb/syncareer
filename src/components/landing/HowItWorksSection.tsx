import AnimatedSection from "./AnimatedSection";

const steps = [
  { n: "01", title: "Assess", body: "5-minute RIASEC + skills diagnostic. Discover careers that actually fit you." },
  { n: "02", title: "Build CV", body: "AI-powered, ATS-ready CV. Quantified achievements, clean one-page format." },
  { n: "03", title: "Practice", body: "Voice interviews with SynAssist. Structured, role-specific questions and feedback." },
  { n: "04", title: "Apply", body: "Real job listings from Ghana and beyond. Track every application in one place." },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-landing-cream py-24 md:py-32 border-t border-landing-ink/10">
      <div className="container mx-auto px-6 max-w-6xl">
        <AnimatedSection>
          <p className="text-xs uppercase tracking-[0.3em] text-landing-ink/50 mb-6">Process</p>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-landing-ink tracking-tight max-w-3xl">
            Four steps from confused to confident.
          </h2>
        </AnimatedSection>

        <div className="mt-16 md:mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-landing-ink/10">
          {steps.map((s, i) => (
            <AnimatedSection key={s.n} delay={i * 0.1} className="bg-landing-cream">
              <div className="p-8 md:p-10 h-full">
                <div className="font-serif text-landing-amber text-lg mb-4">{s.n}</div>
                <h3 className="font-serif text-2xl md:text-3xl text-landing-ink mb-4 leading-tight">{s.title}</h3>
                <p className="text-sm text-landing-ink/65 leading-relaxed">{s.body}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
