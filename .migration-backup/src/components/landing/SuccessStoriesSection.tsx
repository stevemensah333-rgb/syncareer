import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import AnimatedSection from "./AnimatedSection";

const stories = [
  {
    initials: "AK",
    quote: "In four weeks, I went from no clear direction to a UX internship offer.",
    challenge: "Ama struggled to choose between three majors and felt lost about post-graduation paths.",
    solution: "The RIASEC assessment surfaced UX design as a strong fit; the CV builder reformatted her portfolio for ATS.",
    name: "Ama K.",
    role: "UX Design Intern · KNUST, Level 300",
  },
  {
    initials: "KO",
    quote: "I was getting zero callbacks. After Syncareer's CV, I had three interviews in a week.",
    challenge: "Kwame's CV was dense, unfocused, and being filtered out before recruiters ever saw it.",
    solution: "AI rewrote his bullets with quantified achievements and a clean, single-page ATS layout.",
    name: "Kwame O.",
    role: "CS Graduate · UG, 2025",
  },
  {
    initials: "EM",
    quote: "Practicing with SynAssist made the real interview feel routine. I got the offer.",
    challenge: "Esi froze in interviews and couldn't articulate her marketing case studies under pressure.",
    solution: "Six voice-based mock interviews with structured feedback rebuilt her confidence and pacing.",
    name: "Esi M.",
    role: "Marketing Associate · Ashesi",
  },
];

export default function SuccessStoriesSection() {
  return (
    <section className="bg-landing-cream py-24 md:py-32 border-t border-landing-ink/10">
      <div className="container mx-auto px-6 max-w-6xl">
        <AnimatedSection className="text-center mb-16 md:mb-20">
          <p className="text-xs uppercase tracking-[0.3em] text-landing-ink/50 mb-6">Success Stories</p>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-landing-ink tracking-tight max-w-3xl mx-auto">
            Students who broke through.
          </h2>
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <Carousel opts={{ align: "start", loop: true }} className="w-full">
            <CarouselContent>
              {stories.map((s) => (
                <CarouselItem key={s.name} className="md:basis-1/1">
                  <div className="bg-landing-cream-deep rounded-2xl p-8 md:p-12 grid md:grid-cols-[160px_1fr] gap-8 md:gap-12 items-start">
                    <div className="hidden md:flex h-40 w-40 items-center justify-center rounded-full bg-landing-amber/20 font-serif text-5xl text-landing-ink">
                      {s.initials}
                    </div>
                    <div>
                      <p className="font-serif text-2xl md:text-3xl lg:text-4xl text-landing-ink leading-snug mb-8 italic">
                        “{s.quote}”
                      </p>
                      <div className="grid sm:grid-cols-2 gap-6 mb-8">
                        <div>
                          <h4 className="font-serif text-xl text-landing-ink mb-2">Challenge</h4>
                          <p className="text-sm text-landing-ink/65 leading-relaxed">{s.challenge}</p>
                        </div>
                        <div>
                          <h4 className="font-serif text-xl text-landing-ink mb-2">Solution</h4>
                          <p className="text-sm text-landing-ink/65 leading-relaxed">{s.solution}</p>
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-landing-ink text-sm">{s.name}</p>
                        <p className="text-xs text-landing-ink/55">{s.role}</p>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-2 bg-landing-ink text-white hover:bg-black border-none" />
            <CarouselNext className="hidden md:flex -right-2 bg-landing-ink text-white hover:bg-black border-none" />
          </Carousel>
        </AnimatedSection>
      </div>
    </section>
  );
}
