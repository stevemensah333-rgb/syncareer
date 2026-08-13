import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const LANDING_FAQS = [
  {
    q: "Does Syncareer apply to roles for me?",
    a: "No. You apply directly on the original employer's posting, then track your stage, notes, and deadlines in your Syncareer workspace.",
  },
  {
    q: "Where do the opportunities come from?",
    a: "Syncareer aggregates external listings and shows the stored source and original link so you can confirm details before applying.",
  },
  {
    q: "Does the CV guidance guarantee ATS acceptance?",
    a: "No. Our scoring checks completion and evidence quality to help you build a stronger application, but hiring decisions depend on the employer.",
  },
  {
    q: "How is interview practice made specific to a role?",
    a: "You select your target role, industry, and session length, and optional job-description and CV context. Syncareer generates tailored practice questions and feedback from your setup.",
  },
];

export default function FAQSection() {
  return (
    <section id="faqs" className="scroll-mt-24 border-b" aria-labelledby="faq-title">
      <div className="mx-auto grid w-full max-w-[1280px] gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20 lg:px-8 lg:py-24">
        <div>
          <h2 id="faq-title" className="text-balance text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">
            Questions worth answering before you start.
          </h2>
          <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground">
            Practical details, stated plainly before you decide what to do next.
          </p>
        </div>

        <Accordion type="single" collapsible className="border-y">
          {LANDING_FAQS.map((item, index) => (
              <AccordionItem key={item.q} value={`faq-${index}`}>
              <AccordionTrigger className="min-h-14 py-5 text-left text-sm font-semibold hover:no-underline sm:text-base">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="max-w-3xl pb-5 pr-8 text-sm leading-6 text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
