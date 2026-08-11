import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import AnimatedSection from "./AnimatedSection";

const FAQS = [
  {
    q: "Is Syncareer really free?",
    a: "Yes. The career assessment, CV builder starter, and interview practice starter are free forever. There is no card required to start and no upsell inside the assessment.",
  },
  {
    q: "How long does the assessment take?",
    a: "About 5 minutes. It uses a research-backed RIASEC diagnostic plus a short skills and interests pass, then maps you against 25+ career paths with an explanation for every recommendation.",
  },
  {
    q: "Will the CV pass ATS filters?",
    a: "No builder can guarantee an ATS outcome. Syncareer uses a clear single-column template and provides separate, deterministic completion and quality guidance so you can review your content before applying.",
  },
  {
    q: "What is SynAssist and how does the interview practice work?",
    a: "SynAssist is our voice-based interview coach. You pick the role, it runs a structured, role-specific session, and you get calm, actionable feedback the same day — no theatrics, just rehearsal you can measure.",
  },
  {
    q: "Who are the career counsellors?",
    a: "Vetted, experienced counsellors — many of them alumni from Ghanaian universities. You can browse profiles, read what they focus on, and book a one-on-one session directly through the platform.",
  },
  {
    q: "Which universities and students is this built for?",
    a: "Syncareer is built for senior high school, university, TVET students, and recent graduates across Ghana and the broader region. We currently work with 12+ partner universities and are expanding.",
  },
];

export default function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faqs" className="relative py-24 lg:py-32 bg-[#0a1512] text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <AnimatedSection>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00c4cc] text-center">
            FAQs
          </p>
          <h2 className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-center leading-[1.05]">
            Questions students ask.
          </h2>
        </AnimatedSection>

        <div className="mt-14 divide-y divide-white/10 border-y border-white/10">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-6 py-6 text-left group"
                  aria-expanded={isOpen}
                >
                  <span className="text-lg font-medium text-white group-hover:text-[#00c4cc] transition-colors">
                    {f.q}
                  </span>
                  <span className="h-8 w-8 grid place-items-center rounded-full border border-white/15 text-white/70 shrink-0 group-hover:border-[#00c4cc] group-hover:text-[#00c4cc] transition-colors">
                    {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </span>
                </button>
                <div
                  className={`grid transition-all duration-300 ease-out ${
                    isOpen ? "grid-rows-[1fr] opacity-100 pb-6" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="text-[15px] text-white/70 leading-relaxed max-w-3xl pr-12">
                      {f.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
