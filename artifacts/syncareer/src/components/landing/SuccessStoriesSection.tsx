import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import AnimatedSection from "./AnimatedSection";
import { Quote } from "lucide-react";

const stories = [
  {
    initials: "AK",
    quote: "In four weeks, I went from no clear direction to a UX internship offer.",
    name: "Ama K.",
    role: "UX Design Intern · KNUST, Level 300",
  },
  {
    initials: "KO",
    quote: "I was getting zero callbacks. After Syncareer's CV, I had three interviews in a week.",
    name: "Kwame O.",
    role: "CS Graduate · UG, 2025",
  },
  {
    initials: "EM",
    quote: "Practicing with SynAssist made the real interview feel routine. I got the offer.",
    name: "Esi M.",
    role: "Marketing Associate · Ashesi",
  },
];

export default function SuccessStoriesSection() {
  return (
    <section className="bg-background py-20 md:py-28 border-t border-border">
      <div className="container mx-auto px-6 max-w-6xl">
        <AnimatedSection className="max-w-2xl mb-12">
          <p className="text-xs font-medium uppercase tracking-wider text-primary mb-4">Success stories</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight text-foreground tracking-tight">
            Students who broke through.
          </h2>
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <Carousel opts={{ align: "start", loop: true }} className="w-full">
            <CarouselContent>
              {stories.map((s) => (
                <CarouselItem key={s.name} className="md:basis-1/2 lg:basis-1/3">
                  <div className="h-full rounded-xl border border-border bg-card p-6 flex flex-col">
                    <Quote className="h-5 w-5 text-primary mb-4" />
                    <p className="text-base text-foreground leading-relaxed mb-6 flex-1">
                      "{s.quote}"
                    </p>
                    <div className="flex items-center gap-3 pt-4 border-t border-border">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                        {s.initials}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.role}</p>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-4 bg-card text-foreground hover:bg-muted border-border" />
            <CarouselNext className="hidden md:flex -right-4 bg-card text-foreground hover:bg-muted border-border" />
          </Carousel>
        </AnimatedSection>
      </div>
    </section>
  );
}
