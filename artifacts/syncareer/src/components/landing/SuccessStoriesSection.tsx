import AnimatedSection from "./AnimatedSection";

const STORIES = [
  {
    quote: "In four weeks, I went from no clear direction to a UX internship offer.",
    name: "Ama K.",
    role: "UX Design Intern · KNUST, Level 300",
    image: "/landing/story-1.png",
  },
  {
    quote: "I was getting zero callbacks. After Syncareer's CV, I had three interviews in a week.",
    name: "Kwame O.",
    role: "CS Graduate · UG, 2025",
    image: "/landing/story-2.png",
  },
  {
    quote: "Practising with SynAssist made the real interview feel routine. I got the offer.",
    name: "Esi M.",
    role: "Marketing Associate · Ashesi",
    image: "/landing/story-3.png",
  },
  {
    quote: "Finally, advice that didn't just say 'figure it out yourself'. The plan was specific.",
    name: "Naa A.",
    role: "Data Analyst · GIMPA",
    image: "/landing/story-1.png",
  },
];

const STATS = [
  { value: "2,400+", label: "Assessments taken" },
  { value: "12+", label: "Partner universities" },
  { value: "94%", label: "Completion rate" },
];

export default function SuccessStoriesSection() {
  return (
    <section id="stories" className="relative py-24 lg:py-32 bg-[#0a1512] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <AnimatedSection>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00c4cc]">
            Success stories
          </p>
          <div className="mt-3 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight max-w-2xl leading-[1.05]">
              Students who broke through.
            </h2>
            <p className="text-lg text-white/70 max-w-md leading-relaxed">
              Real graduates from Ghanaian universities using Syncareer to
              discover, prepare, and land their first role.
            </p>
          </div>
        </AnimatedSection>

        {/* Stats bar */}
        <AnimatedSection delay={0.05}>
          <div className="mt-14 grid grid-cols-3 rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className={`p-6 sm:p-8 ${
                  i > 0 ? "border-l border-white/10" : ""
                }`}
              >
                <p className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#00c4cc]">
                  {s.value}
                </p>
                <p className="mt-2 text-sm text-white/60">{s.label}</p>
              </div>
            ))}
          </div>
        </AnimatedSection>

        {/* Stories grid */}
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {STORIES.map((s, i) => (
            <AnimatedSection key={s.name + i} delay={i * 0.06}>
              <figure className="group h-full rounded-2xl border border-white/10 bg-white/[0.02] p-5 flex flex-col transition-all duration-300 hover:border-[#00c4cc]/40 hover:-translate-y-1">
                <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-white/5">
                  <img
                    src={s.image}
                    alt={s.name}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                </div>
                <blockquote className="mt-5 text-[15px] text-white/85 leading-relaxed">
                  “{s.quote}”
                </blockquote>
                <figcaption className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-sm font-semibold text-white">{s.name}</p>
                  <p className="text-xs text-white/60 mt-0.5">{s.role}</p>
                </figcaption>
              </figure>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
