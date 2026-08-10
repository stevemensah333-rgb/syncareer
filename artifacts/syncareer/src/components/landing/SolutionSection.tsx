import AnimatedSection from "./AnimatedSection";
import { ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const services = [
  {
    image: "/landing/feature-cv.webp",
    eyebrow: "Career Assessment",
    title: "Find a path that actually fits.",
    body: "RIASEC + skills + interests cross-referenced with 25+ career paths so the recommendation feels obvious, not generic.",
    href: "/assessment",
    cta: "Take the assessment",
  },
  {
    image: "/landing/feature-interview.webp",
    eyebrow: "CV Builder",
    title: "An ATS-ready CV in minutes.",
    body: "Templates engineered to pass screening filters, with a built-in score that tells you exactly what to tighten.",
    href: "/cv-builder",
    cta: "Open the builder",
  },
  {
    image: "/landing/story-2.webp",
    eyebrow: "Interview Simulator",
    title: "Walk in already rehearsed.",
    body: "Voice interviews with SynAssist. Role-specific prompts, calm pacing, and feedback you can act on the same day.",
    href: "/interview-simulator",
    cta: "Practice now",
  },
  {
    image: "/landing/feature-counsellor.webp",
    eyebrow: "Counsellor Marketplace",
    title: "Talk to a real career counsellor.",
    body: "Book a session with a vetted counsellor — one-on-one guidance from people who have walked the path before you.",
    href: "/counsellors",
    cta: "Browse counsellors",
  },
];

export default function SolutionSection() {
  const navigate = useNavigate();
  return (
    <section id="features" className="relative py-24 md:py-32">
      <div className="container mx-auto px-6 max-w-6xl">
        <AnimatedSection className="max-w-3xl mb-16 md:mb-20">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground mb-5">
            What you get
          </p>
          <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-semibold leading-[1.1] text-foreground tracking-tight">
            Everything you need to land your first role.
          </h2>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-x-10 lg:gap-y-14">
          {services.map((s, i) => (
            <AnimatedSection key={s.title} delay={(i % 2) * 0.08}>
              <button
                onClick={() => navigate(s.href)}
                className="group block w-full text-left h-full"
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
                  <img
                    src={s.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  />
                  <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
                    <span className="inline-flex items-center rounded-full bg-white/85 backdrop-blur px-3 py-1 text-[11px] font-medium text-muted-foreground ring-1 ring-black/[0.04]">
                      {s.eyebrow}
                    </span>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-foreground transition-transform duration-300 group-hover:rotate-45">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
                <div className="pt-5 px-1">
                  <h3 className="font-sans text-xl md:text-2xl font-semibold leading-snug text-foreground mb-2 tracking-tight">
                    {s.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {s.body}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    {s.cta}
                    <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </div>
              </button>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
