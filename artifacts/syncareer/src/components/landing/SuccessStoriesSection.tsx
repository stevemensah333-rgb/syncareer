import AnimatedSection from "./AnimatedSection";

const stories = [
  {
    photo: "/landing/story-1.png",
    quote:
      "In four weeks, I went from no clear direction to a UX internship offer.",
    name: "Ama K.",
    role: "UX Design Intern · KNUST, Level 300",
  },
  {
    photo: "/landing/story-2.png",
    quote:
      "I was getting zero callbacks. After Syncareer's CV, I had three interviews in a week.",
    name: "Kwame O.",
    role: "CS Graduate · UG, 2025",
  },
  {
    photo: "/landing/story-3.png",
    quote:
      "Practising with SynAssist made the real interview feel routine. I got the offer.",
    name: "Esi M.",
    role: "Marketing Associate · Ashesi",
  },
  {
    photo: "/landing/story-1.png",
    quote:
      "Finally, advice that didn't just say 'figure it out yourself'. The plan was specific.",
    name: "Naa A.",
    role: "Data Analyst · GIMPA",
  },
];

export default function SuccessStoriesSection() {
  return (
    <section className="relative py-24 md:py-32">
      <div className="container mx-auto px-6 max-w-6xl">
        <AnimatedSection className="max-w-3xl mb-12 md:mb-16">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/50 mb-5">
            Success stories
          </p>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-foreground tracking-[-0.01em]">
            Students who <em>broke through.</em>
          </h2>
        </AnimatedSection>
      </div>

      {/* Horizontal-snap scroller — bleeds to the edge of the viewport */}
      <AnimatedSection delay={0.1}>
        <div
          className="flex gap-5 md:gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-6 px-6 md:px-12 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {stories.map((s, i) => (
            <div
              key={`${s.name}-${i}`}
              className="snap-start shrink-0 w-[82%] sm:w-[60%] md:w-[44%] lg:w-[32%]"
            >
              <article className="group h-full">
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
                  <img
                    src={s.photo}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.45) 100%)",
                    }}
                  />
                  <blockquote className="absolute inset-x-5 bottom-5 text-white">
                    <p className="font-serif text-lg md:text-xl leading-snug">
                      &ldquo;{s.quote}&rdquo;
                    </p>
                  </blockquote>
                </div>
                <div className="pt-4 px-1">
                  <p className="text-sm font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-foreground/55">{s.role}</p>
                </div>
              </article>
            </div>
          ))}
          {/* Trailing spacer so the last card snaps cleanly */}
          <div className="shrink-0 w-1 md:w-6" aria-hidden />
        </div>
      </AnimatedSection>
    </section>
  );
}
