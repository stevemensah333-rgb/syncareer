import { Compass, FileText, Mic, ArrowRight } from "lucide-react";
import AnimatedSection from "./AnimatedSection";

const features = [
  { icon: Compass, title: "Career Discovery", body: "A clear roadmap that turns your strengths into a shortlist of careers." },
  { icon: FileText, title: "CV That Gets Callbacks", body: "Quantified achievements, ATS-friendly formatting, instant strength scoring." },
  { icon: Mic, title: "Interviews on Demand", body: "Practice voice interviews any time and walk in confident on the day." },
];

export default function FeatureSpotlightSection() {
  return (
    <section className="bg-muted/40 py-20 md:py-28 border-t border-border">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Mock product preview */}
          <AnimatedSection>
            <div className="relative rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted/50">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
                <span className="ml-3 text-xs text-muted-foreground">syncareer.me / dashboard</span>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Career Readiness</p>
                    <p className="text-2xl font-semibold text-foreground">78%</p>
                  </div>
                  <div className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary font-medium">+12 this week</div>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-[78%] rounded-full bg-primary" />
                </div>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {[
                    { l: "Assessment", v: "Done" },
                    { l: "CV Score", v: "82/100" },
                    { l: "Interviews", v: "4 done" },
                  ].map((s) => (
                    <div key={s.l} className="rounded-lg border border-border p-3">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.l}</p>
                      <p className="text-sm font-semibold text-foreground mt-1">{s.v}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 pt-2">
                  {["Polish your CV summary", "Practice STAR answers", "Apply to 3 saved roles"].map((t, i) => (
                    <div key={t} className="flex items-center gap-3 text-sm">
                      <span className={`h-4 w-4 rounded border ${i === 0 ? "bg-primary border-primary" : "border-border"}`} />
                      <span className={i === 0 ? "text-muted-foreground line-through" : "text-foreground"}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AnimatedSection>

          <div>
            <AnimatedSection>
              <p className="text-xs font-medium uppercase tracking-wider text-primary mb-4">Tools</p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight text-foreground tracking-tight mb-10">
                Real tools, real outcomes.
              </h2>
            </AnimatedSection>

            <div className="space-y-6">
              {features.map((f, i) => (
                <AnimatedSection key={f.title} delay={i * 0.08}>
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <f.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground mb-1">{f.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>

            <AnimatedSection delay={0.3}>
              <a href="/assessment" className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                See it in action <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </AnimatedSection>
          </div>
        </div>
      </div>
    </section>
  );
}
