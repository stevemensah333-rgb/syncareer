import { Bot, UserCheck, ShieldCheck } from "lucide-react";
import AnimatedSection from "./AnimatedSection";
import RippleBackground from "./RippleBackground";

const PILLARS = [
  {
    tag: "AI, supervised",
    title: "The engine that never sleeps.",
    body: "Specialised AI for assessment, CV scoring, and interview practice — running whenever you need it, without waiting on office hours.",
    Icon: Bot,
  },
  {
    tag: "Human guidance",
    title: "Real counsellors, when it matters.",
    body: "Vetted career counsellors you can book directly. Real judgement for the moments the AI cannot answer for you.",
    Icon: UserCheck,
  },
  {
    tag: "Explainable",
    title: "Scores you can defend.",
    body: "Every recommendation, every score, every fix comes with a reason. No black-box results, no vague advice.",
    Icon: ShieldCheck,
  },
];

export default function WhyDifferentSection() {
  return (
    <RippleBackground
      className="py-24 lg:py-32 text-white"
      accent="rgba(0,196,204,0.14)"
    >
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <AnimatedSection>
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00c4cc]">
              Why Syncareer is different
            </p>
            <h2 className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]">
              Built for outcomes, not vibes.
            </h2>
            <p className="mt-6 text-lg text-white/70 leading-relaxed">
              Most career tools give you dashboards. Most advice is generic.
              Syncareer combines a supervised AI system with real counsellors —
              so the guidance is fast, specific, and grounded in your actual
              context.
            </p>
          </div>
        </AnimatedSection>

        <div className="mt-14 grid md:grid-cols-3 gap-5">
          {PILLARS.map((p, i) => (
            <AnimatedSection key={p.tag} delay={i * 0.08}>
              <div className="group h-full rounded-2xl border border-white/10 bg-white/[0.02] p-7 transition-all duration-300 hover:border-[#00c4cc]/40 hover:bg-white/[0.04] hover:-translate-y-1">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/70">
                  <p.Icon className="h-3.5 w-3.5 text-[#00c4cc]" />
                  {p.tag}
                </span>
                <h3 className="mt-6 text-2xl font-semibold tracking-tight">
                  {p.title}
                </h3>
                <p className="mt-3 text-[15px] text-white/70 leading-relaxed">
                  {p.body}
                </p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </RippleBackground>
  );
}
