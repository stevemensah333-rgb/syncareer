import AnimatedSection from "./AnimatedSection";

const PHOTOS = [
  "/landing/story-1.webp",
  "/landing/story-2.webp",
  "/landing/story-3.webp",
  "/landing/feature-counsellor.webp",
  "/landing/story-1.webp",
  "/landing/feature-cv.webp",
  "/landing/story-2.webp",
  "/landing/feature-interview.webp",
  "/landing/story-3.webp",
  "/landing/story-1.webp",
  "/landing/story-2.webp",
  "/landing/story-3.webp",
];

export default function CommunitySection() {
  return (
    <section className="relative py-24 lg:py-32 bg-[#f7f5ef] text-[#0a1512]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-14 items-start">
          <AnimatedSection>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#009ba1]">
              Community
            </p>
            <h2 className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]">
              A network that keeps helping.
            </h2>
            <p className="mt-6 text-lg text-[#0a1512]/70 leading-relaxed">
              Vetted counsellors, alumni mentors, and thousands of students from
              partner universities across Ghana and beyond. Support that stays
              close long after you land the first role.
            </p>

            <ul className="mt-8 space-y-3 text-[15px] text-[#0a1512]/80">
              {[
                "Vetted career counsellors, one-on-one",
                "Peer stories from KNUST, UG, Ashesi, GIMPA",
                "Warm intros when a fit shows up",
                "Alumni outcomes tracked by university",
              ].map((l) => (
                <li key={l} className="flex items-center gap-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00c4cc]" />
                  {l}
                </li>
              ))}
            </ul>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {PHOTOS.map((src, i) => (
                <div
                  key={i}
                  className={`relative overflow-hidden rounded-xl bg-black/5 ${
                    i % 5 === 0 ? "aspect-square" : "aspect-[3/4]"
                  }`}
                >
                  <img
                    src={src}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm text-[#0a1512]/60 text-center">
              Students and counsellors already using Syncareer.
            </p>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
