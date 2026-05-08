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
          {/* Editorial photo paired with the prose */}
          <AnimatedSection>
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl">
              <img
                src="/landing/feature-cv.png"
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-x-6 bottom-6 rounded-xl bg-white/90 backdrop-blur px-5 py-4 ring-1 ring-black/[0.04]">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-foreground/50">
                  Career Readiness
                </p>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="font-sans text-2xl font-semibold text-foreground tracking-tight">
                    78%
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium">
                    +12 this week
                  </span>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                  <div className="h-full w-[78%] rounded-full bg-primary" />
                </div>
              </div>
            </div>
          </AnimatedSection>

          <div>
            <AnimatedSection>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/50 mb-5">
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
                    <p className="text-base text-foreground/65 leading-relaxed max-w-md">
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
