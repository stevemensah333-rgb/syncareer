import { Compass, FileText, Mic } from "lucide-react";
import AnimatedSection from "./AnimatedSection";
import landingSpotlight from "@/assets/landing-spotlight.jpg";

const features = [
  { icon: Compass, title: "Career Discovery", body: "A clear roadmap that turns your strengths into a shortlist of careers." },
  { icon: FileText, title: "CV That Gets Callbacks", body: "Quantified achievements, ATS-friendly formatting, instant strength scoring." },
  { icon: Mic, title: "Interviews on Demand", body: "Practice voice interviews any time and walk in confident on the day." },
];

export default function FeatureSpotlightSection() {
  return (
    <section className="bg-landing-cream py-24 md:py-32 border-t border-landing-ink/10">
      <div className="container mx-auto px-6 max-w-6xl">
        <AnimatedSection className="text-center mb-16 md:mb-20">
          <p className="text-xs uppercase tracking-[0.3em] text-landing-ink/50 mb-6">Tools</p>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-landing-ink tracking-tight max-w-3xl mx-auto">
            Real tools, real outcomes.
          </h2>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          <AnimatedSection>
            <div className="aspect-square rounded-2xl overflow-hidden">
              <img
                src={landingSpotlight}
                alt="Students collaborating with Syncareer"
                width={1024}
                height={1024}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
          </AnimatedSection>

          <div className="space-y-10">
            {features.map((f, i) => (
              <AnimatedSection key={f.title} delay={i * 0.1}>
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-landing-amber/15 text-landing-amber">
                    <f.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-serif text-2xl md:text-3xl text-landing-ink mb-2 leading-tight">{f.title}</h3>
                    <p className="text-sm md:text-base text-landing-ink/65 leading-relaxed">{f.body}</p>
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
