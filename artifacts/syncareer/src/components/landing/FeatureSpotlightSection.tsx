import { ArrowRight } from "lucide-react";
import AnimatedSection from "./AnimatedSection";

const highlights = [
  {
    title: "Career Discovery",
    body: "A clear roadmap that turns your strengths into a shortlist of careers you can actually pursue from where you are today.",
  },
  {
    title: "CV That Gets Callbacks",
    body: "Quantified achievements, ATS-friendly formatting, instant strength scoring — written in the way recruiters actually scan.",
  },
  {
    title: "Interviews on Demand",
    body: "Practice voice interviews any time, in private, and walk in confident on the day. No theatrics, just calm rehearsal.",
  },
];

export default function FeatureSpotlightSection() {
  return (
    <section className="relative py-24 md:py-32">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-24 items-center">
          {/* Onboarding demo video — browser-chrome framing for editorial feel */}
          <AnimatedSection>
            <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-2xl shadow-black/10">
              <div className="flex items-center gap-2 px-4 py-3 bg-muted border-b border-border">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-warning/60" />
                  <div className="w-3 h-3 rounded-full bg-success/60" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-background rounded-md px-3 py-1.5 text-xs text-muted-foreground max-w-md mx-auto text-center">
                    syncareer.app
                  </div>
                </div>
              </div>
              <div className="relative aspect-video bg-foreground/5">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                >
                  <source
                    src="https://fsorkxlcasekndigezlx.supabase.co/storage/v1/object/public/videos/demo-video.mp4"
                    type="video/mp4"
                  />
                </video>
              </div>
            </div>
          </AnimatedSection>

          <div>
            <AnimatedSection>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground mb-5">
                Real tools
              </p>
              <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-semibold leading-[1.1] text-foreground tracking-tight mb-10">
                Calm tools, real outcomes.
              </h2>
            </AnimatedSection>

            <div className="space-y-8">
              {highlights.map((f, i) => (
                <AnimatedSection key={f.title} delay={i * 0.08}>
                  <div className="border-t border-foreground/10 pt-6">
                    <h3 className="font-sans text-lg md:text-xl font-semibold text-foreground mb-2 leading-snug tracking-tight">
                      {f.title}
                    </h3>
                    <p className="text-base text-muted-foreground leading-relaxed max-w-md">
                      {f.body}
                    </p>
                  </div>
                </AnimatedSection>
              ))}
            </div>

            <AnimatedSection delay={0.3}>
              <a
                href="/assessment"
                className="mt-10 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4"
              >
                See it in action
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </AnimatedSection>
          </div>
        </div>
      </div>
    </section>
  );
}
