import { ArrowRight, CalendarClock, MessagesSquare, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimatedSection from "./AnimatedSection";

interface MentorCalloutProps {
  onBecomeMentor: () => void;
  onFindMentor: () => void;
}

const MENTOR_POINTS = [
  {
    icon: CalendarClock,
    title: "You set the hours",
    body: "Publish the weekly windows that suit you. Students can only book inside them, and you can pause any time.",
  },
  {
    icon: MessagesSquare,
    title: "Focused conversations",
    body: "Students arrive with a real application: the role, their evidence, and the question they are stuck on.",
  },
  {
    icon: ShieldCheck,
    title: "Verified and voluntary",
    body: "Mentor accounts are reviewed before they go live. Mentoring is unpaid, and Syncareer stays free for students.",
  },
];

export default function MentorCallout({ onBecomeMentor, onFindMentor }: MentorCalloutProps) {
  return (
    <AnimatedSection>
      <section id="mentorship" className="scroll-mt-24 border-b" aria-labelledby="mentorship-title">
        <div className="mx-auto grid w-full max-w-[1280px] gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-8 lg:py-24">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="brand-eyebrow">Volunteer mentorship</p>
            <h2
              id="mentorship-title"
              className="mt-4 text-balance text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl"
            >
              Give a few hours. Help a graduate get their next role.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
              Syncareer mentors are working professionals who volunteer short, practical sessions — reviewing a CV,
              talking through an application, or preparing someone for an interview. There is no fee to mentors and no
              cost to students.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={onBecomeMentor} className="min-h-12 gap-2 px-6 text-base">
                Volunteer as a mentor <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <button
                type="button"
                onClick={onFindMentor}
                className="min-h-11 px-2 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Looking for a mentor instead?
              </button>
            </div>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {MENTOR_POINTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="rounded-xl border bg-card p-6">
                <span className="inline-flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-semibold tracking-[-0.01em]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </AnimatedSection>
  );
}
