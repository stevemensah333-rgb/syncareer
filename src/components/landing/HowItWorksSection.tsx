import AnimatedSection from "./AnimatedSection";

const steps = [
  { n: "01", title: "Assess", body: "5-minute RIASEC + skills diagnostic. Discover careers that actually fit you." },
  { n: "02", title: "Build CV", body: "AI-powered, ATS-ready CV. Quantified achievements in a clean one-page format." },
  { n: "03", title: "Practice", body: "Voice interviews with SynAssist. Structured, role-specific questions and feedback." },
  { n: "04", title: "Apply", body: "Real job listings from Ghana and beyond. Track every application in one place." },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-muted/40 py-20 md:py-28 border-t border-border">
      <div className="container mx-auto px-6 max-w-6xl">
        <AnimatedSection className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-wider text-primary mb-4">How it works</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight text-foreground tracking-tight">
            Four steps from confused to confident.
          </h2>
        </AnimatedSection>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((s, i) => (
            <AnimatedSection key={s.n} delay={i * 0.08}>
              <div className="h-full rounded-xl border border-border bg-card p-6 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-primary/10 text-primary text-sm font-semibold mb-4">
                  {s.n}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
