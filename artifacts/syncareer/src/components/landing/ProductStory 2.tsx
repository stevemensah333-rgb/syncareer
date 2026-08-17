import { Check, FileCheck2, Search, Target } from "lucide-react";
import { APPLICATION_STAGES, type ApplicationStage } from "./ApplicationRecord";

const journeyCopy: Record<ApplicationStage, string> = {
  opportunity: "Save the real listing and its source.",
  evidence: "Check each requirement against your experience.",
  cv: "Improve wording without adding facts.",
  interview: "Practise questions tied to the role.",
  action: "Set the next task and due date.",
  outcome: "Record what actually happened.",
};

const trust = [
  { icon: Search, title: "From the listing", text: "Opportunities keep their external source labels and original links." },
  { icon: Check, title: "Provided by you", text: "You decide which experience supports a role requirement." },
  { icon: FileCheck2, title: "Suggested for review", text: "CV wording and interview prompts remain guidance you can inspect." },
  { icon: Target, title: "Not guaranteed", text: "Syncareer does not promise verification, ATS acceptance or hiring outcomes." },
];

export default function ProductStory() {
  const openHeroStage = (stage: ApplicationStage) => {
    const control = document.getElementById(`hero-record-tab-${stage}`);
    control?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "center",
    });
    control?.focus();
    control?.click();
  };

  return (
    <>
      <section id="workflow" className="scroll-mt-24 border-b bg-card" aria-labelledby="workflow-title">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">One role, six connected steps</p>
              <h2 id="workflow-title" className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">From finding the role to tracking the result.</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">Select any step to inspect it in the application workspace above.</p>
          </div>
          <ol className="mt-8 grid border-y sm:grid-cols-2 lg:grid-cols-6">
            {APPLICATION_STAGES.map((stage, index) => (
              <li key={stage.id} className="relative border-b p-4 last:border-b-0 sm:border-r sm:[&:nth-child(2n)]:border-r-0 lg:border-b-0 lg:[&:nth-child(2n)]:border-r lg:last:border-r-0">
                <button type="button" onClick={() => openHeroStage(stage.id)} className="group block min-h-24 w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4">
                  <span className="text-xs font-semibold text-primary">0{index + 1}</span>
                  <span className="mt-2 block text-sm font-semibold group-hover:text-primary">{stage.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">{journeyCopy[stage.id]}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="product" className="scroll-mt-24 border-b bg-secondary/35" aria-labelledby="transformation-title">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
            <div>
              <p className="text-sm font-semibold text-primary">Graduate Data Analyst · illustrative example</p>
              <h2 id="transformation-title" className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">See how one piece of evidence improves the whole application.</h2>
              <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground">The requirement stays connected to your evidence, CV wording, interview practice and next action. Nothing new is invented along the way.</p>
            </div>
            <div className="border-y bg-card lg:border-x">
              <TransformationRow label="From the listing" title="Build and communicate data insights using SQL" />
              <TransformationRow label="Evidence provided by you" title="Created a reporting dashboard for a coursework project" tone="success" />
              <div className="grid sm:grid-cols-2">
                <TransformationRow label="Before" title="Worked on a data project" muted />
                <TransformationRow label="Suggested for review" title="Created a SQL reporting dashboard for a coursework project" tone="primary" bordered />
              </div>
              <div className="grid sm:grid-cols-2">
                <TransformationRow label="Interview practice" title="How did you use SQL to turn coursework data into a clear dashboard?" />
                <TransformationRow label="Next action set by you" title="Check whether the role needs AWS evidence before applying" bordered />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b bg-card" aria-labelledby="trust-title">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6 lg:px-8">
          <h2 id="trust-title" className="text-xl font-semibold tracking-[-0.025em]">Helpful guidance, with clear boundaries.</h2>
          <div className="mt-6 grid gap-px overflow-hidden border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {trust.map(({ icon: Icon, title, text }) => (
              <div key={title} className="bg-card p-4">
                <div className="flex items-center gap-2 text-sm font-semibold"><Icon className="h-4 w-4 text-primary" aria-hidden="true" />{title}</div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function TransformationRow({ label, title, tone, muted = false, bordered = false }: { label: string; title: string; tone?: "primary" | "success"; muted?: boolean; bordered?: boolean }) {
  const toneClass = tone === "success" ? "text-success" : tone === "primary" ? "text-primary" : "text-muted-foreground";
  return (
    <div className={`p-4 sm:p-5 ${bordered ? "border-t sm:border-l sm:border-t-0" : "border-b"}`}>
      <p className={`text-xs font-semibold ${toneClass}`}>{label}</p>
      <p className={`mt-2 text-sm leading-6 ${muted ? "text-muted-foreground line-through" : "font-medium"}`}>{title}</p>
    </div>
  );
}

export { APPLICATION_STAGES };
