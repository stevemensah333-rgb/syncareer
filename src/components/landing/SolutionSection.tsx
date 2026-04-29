import AnimatedSection from "./AnimatedSection";
import { Sparkles, FileCheck2, Mic, Briefcase, GraduationCap, Users } from "lucide-react";

const reasons = [
  { icon: Sparkles, title: "AI Career Match", body: "RIASEC + skills + interests cross-referenced with 25+ career paths to surface roles you'll actually thrive in." },
  { icon: FileCheck2, title: "ATS-Ready CV", body: "Templates engineered to pass screening filters used by real recruiters across Africa and beyond." },
  { icon: Mic, title: "Voice Interview Prep", body: "Practice with SynAssist using role-specific questions and get structured, deterministic feedback." },
  { icon: Briefcase, title: "Real Job Listings", body: "Curated entry-level openings from Jobberman, BrightSpire, and direct employer postings on Syncareer." },
  { icon: GraduationCap, title: "Skill Gap Closing", body: "Free YouTube and curated learning paths matched to the exact skills your target role requires." },
  { icon: Users, title: "Mentor Access", body: "Book sessions with vetted career counsellors who understand the local job market." },
];

export default function SolutionSection() {
  return (
    <section id="features" className="bg-background py-20 md:py-28 border-t border-border">
      <div className="container mx-auto px-6 max-w-6xl">
        <AnimatedSection className="max-w-2xl mb-14">
          <p className="text-xs font-medium uppercase tracking-wider text-primary mb-4">Why Syncareer</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight text-foreground tracking-tight">
            Everything you need to land your first role.
          </h2>
        </AnimatedSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reasons.map((r, i) => (
            <AnimatedSection key={r.title} delay={(i % 3) * 0.08}>
              <div className="h-full rounded-xl border border-border bg-card p-6 hover:border-primary/30 hover:shadow-md transition-all">
                <div className="inline-flex items-center justify-center h-9 w-9 rounded-md bg-primary/10 text-primary mb-4">
                  <r.icon className="h-4 w-4" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{r.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{r.body}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
