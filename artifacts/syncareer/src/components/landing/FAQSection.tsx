import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const LANDING_FAQS = [
  {
    q: "Does Syncareer apply to roles for me?",
    a: "No. For externally sourced opportunities, you apply on the original posting. You can then record that you applied so the role, deadline, notes, preparation, stage, and outcome stay organised in your workspace.",
  },
  {
    q: "Are the opportunities verified by Syncareer?",
    a: "No. Opportunities can be aggregated from external sources and are not independently verified by Syncareer. The product shows the stored source and original link where available so you can confirm the role, requirements, and deadline before applying.",
  },
  {
    q: "Does the CV quality score guarantee that my CV will pass an applicant tracking system?",
    a: "No. Completion and quality are deterministic guidance based on meaningful fields and visible writing or evidence patterns. They do not predict applicant tracking system acceptance, interviews, or hiring outcomes.",
  },
  {
    q: "How is interview practice made specific to a job?",
    a: "You configure the target role, industry, interview type, session length, and optional job-description and CV context. Questions and feedback are AI-generated from that setup, so they should be reviewed critically rather than treated as an employer assessment.",
  },
];

export default function FAQSection() {
  return (
    <section id="faqs" className="scroll-mt-24 border-b" aria-labelledby="faq-title">
      <div className="mx-auto grid w-full max-w-[1400px] gap-8 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[0.7fr_1.3fr] lg:gap-14 lg:px-8">
        <div>
          <h2 id="faq-title" className="text-balance text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">
            Questions worth answering before you start.
          </h2>
          <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground">
            Syncareer is designed to support your judgement, not replace it. These are the boundaries that matter most.
          </p>
        </div>

        <Accordion type="single" collapsible className="rounded-xl border bg-card px-4 sm:px-6">
          {LANDING_FAQS.map((item, index) => (
            <AccordionItem key={item.q} value={`faq-${index}`}>
              <AccordionTrigger className="min-h-14 py-4 text-left text-sm font-semibold hover:no-underline sm:text-base">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="max-w-3xl pb-5 pr-6 text-sm leading-6 text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
