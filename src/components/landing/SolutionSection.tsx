import AnimatedSection from "./AnimatedSection";

const reasons = [
  { n: "001", title: "AI Career Match", body: "RIASEC + skills + interests cross-referenced with 25+ career paths to surface roles you'll actually thrive in." },
  { n: "002", title: "ATS-Ready CV", body: "Templates engineered to pass screening filters used by real recruiters across Africa and beyond." },
  { n: "003", title: "Voice Interview Prep", body: "Practice with SynAssist using role-specific questions and get structured, deterministic feedback." },
  { n: "004", title: "Real Job Listings", body: "Curated entry-level openings from Jobberman, BrightSpire, and direct employer postings on Syncareer." },
  { n: "005", title: "Skill Gap Closing", body: "Free YouTube and curated learning paths matched to the exact skills your target role requires." },
  { n: "006", title: "Mentor Access", body: "Book sessions with vetted career counsellors who understand the local job market." },
];

export default function SolutionSection() {
  return (
    <section id="features" className="bg-landing-cream py-24 md:py-32 border-t border-landing-ink/10">
      <div className="container mx-auto px-6 max-w-6xl">
        <AnimatedSection className="text-center mb-16 md:mb-20">
          <p className="text-xs uppercase tracking-[0.3em] text-landing-ink/50 mb-6">Why Syncareer</p>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-landing-ink tracking-tight max-w-3xl mx-auto">
            Six reasons students stay.
          </h2>
        </AnimatedSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-landing-ink/10">
          {reasons.map((r, i) => (
            <AnimatedSection key={r.n} delay={(i % 3) * 0.08} className="bg-landing-cream">
              <div className="p-8 md:p-10 h-full text-center">
                <div className="font-serif text-landing-amber text-base mb-4">{r.n}</div>
                <h3 className="font-serif text-2xl md:text-[1.75rem] text-landing-ink mb-4 leading-tight">{r.title}</h3>
                <p className="text-sm text-landing-ink/65 leading-relaxed max-w-xs mx-auto">{r.body}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
