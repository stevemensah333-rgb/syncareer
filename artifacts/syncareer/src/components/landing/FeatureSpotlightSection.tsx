import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Compass, FileText, Mic, Users } from "lucide-react";
import AnimatedSection from "./AnimatedSection";
import RippleBackground from "./RippleBackground";

const TRACKS = [
  {
    tag: "Career Assessment",
    title: "Find a path that actually fits.",
    body: "RIASEC + skills + interests cross-referenced with 25+ career paths so the recommendation feels obvious, not generic.",
    cta: "Take the assessment",
    href: "/assessment",
    Icon: Compass,
  },
  {
    tag: "CV Builder",
    title: "An ATS-ready CV in minutes.",
    body: "Templates engineered to pass screening filters, with a built-in score that tells you exactly what to tighten.",
    cta: "Open the builder",
    href: "/cv-builder",
    Icon: FileText,
  },
  {
    tag: "Interview Practice",
    title: "Walk in already rehearsed.",
    body: "Voice interviews with SynAssist. Role-specific prompts, calm pacing, and feedback you can act on the same day.",
    cta: "Practise now",
    href: "/interview-simulator",
    Icon: Mic,
  },
  {
    tag: "Counsellor Marketplace",
    title: "Talk to a real career counsellor.",
    body: "Book a session with a vetted counsellor — one-on-one guidance from people who have walked the path before you.",
    cta: "Browse counsellors",
    href: "/counsellors",
    Icon: Users,
  },
];

export default function FeatureSpotlightSection() {
  const navigate = useNavigate();
  return (
    <RippleBackground
      className="py-24 lg:py-32 text-white"
      accent="rgba(0,196,204,0.16)"
    >
      <section id="tracks" className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00c4cc]">
              What you get
            </p>
            <div className="mt-3 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight max-w-2xl leading-[1.05]">
                Four tools. One calm journey.
              </h2>
              <p className="text-lg text-white/70 max-w-md leading-relaxed">
                Pick a starting point or use them together. Every tool feeds the
                next so nothing you do is wasted.
              </p>
            </div>
          </AnimatedSection>

          <div className="mt-16 grid sm:grid-cols-2 gap-5">
            {TRACKS.map((t, i) => (
              <AnimatedSection key={t.tag} delay={i * 0.06}>
                <button
                  onClick={() => navigate(t.href)}
                  className="group text-left w-full h-full rounded-2xl border border-white/10 bg-white/[0.02] p-7 transition-all duration-300 hover:border-[#00c4cc]/40 hover:bg-white/[0.04] hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/70">
                        <t.Icon className="h-3.5 w-3.5 text-[#00c4cc]" />
                        {t.tag}
                      </span>
                      <h3 className="mt-5 text-2xl font-semibold tracking-tight text-white">
                        {t.title}
                      </h3>
                      <p className="mt-3 text-[15px] text-white/70 leading-relaxed max-w-md">
                        {t.body}
                      </p>
                    </div>
                    <ArrowUpRight className="h-5 w-5 text-white/40 group-hover:text-[#00c4cc] transition-colors shrink-0" />
                  </div>

                  <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#00c4cc]">
                    {t.cta}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </div>
                </button>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>
    </RippleBackground>
  );
}
