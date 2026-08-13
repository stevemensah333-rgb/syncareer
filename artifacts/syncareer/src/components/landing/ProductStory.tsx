import type { ReactNode } from "react";
import { ArrowUpRight, Check, Circle, FileText, Mic2, ShieldCheck } from "lucide-react";
import { APPLICATION_STAGES, type ApplicationStage } from "./ApplicationRecord";

const journeyNotes: Array<{
  stage: ApplicationStage;
  number: string;
  title: string;
  copy: string;
}> = [
  {
    stage: "opportunity",
    number: "01",
    title: "A role begins with its source, not a vague match score.",
    copy: "Keep the listing label, organisation, location, level, deadline, and requirements together before deciding to pursue it.",
  },
  {
    stage: "evidence",
    number: "02",
    title: "Requirements become evidence checks—not claims.",
    copy: "Connect a requirement to project evidence or coursework, mark it as developing, or leave it visibly unsupported.",
  },
  {
    stage: "cv",
    number: "03",
    title: "CV guidance is useful only when it stays reviewable.",
    copy: "Suggested wording stays guidance until you compare it with the evidence you supplied.",
  },
  {
    stage: "interview",
    number: "04",
    title: "Practice has a role-specific reference point.",
    copy: "The same role and recorded examples give interview practice a concrete place to begin.",
  },
  {
    stage: "action",
    number: "05",
    title: "Next actions are deliberate and user controlled.",
    copy: "Record your stage, CV link, follow-up, or reminder when you choose to. It stays with the role.",
  },
  {
    stage: "outcome",
    number: "06",
    title: "An outcome is meaningful precisely because it is not assumed.",
    copy: "Add an outcome when you have one. Nothing is inferred from an external application.",
  },
];

export default function ProductStory() {
  const openHeroStage = (stage: ApplicationStage) => {
    const control = document.getElementById(`hero-record-tab-${stage}`);
    control?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    control?.focus();
    control?.click();
  };

  return (
    <>
      <section id="workflow" className="scroll-mt-24 border-b bg-background" aria-labelledby="workflow-title">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="grid gap-10 border-b pb-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20 lg:pb-16">
            <div>
              <p className="eyebrow text-primary">One application record</p>
              <h2 id="workflow-title" className="mt-3 text-balance text-3xl font-semibold tracking-[-0.045em] sm:text-4xl lg:text-5xl">
                The role stays legible as your work changes around it.
              </h2>
            </div>
            <p className="max-w-2xl self-end text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Syncareer is designed around continuity. You should not have to reconstruct the opportunity every time you check a requirement, revise evidence, practise, or decide what comes next.
            </p>
          </div>

          <div className="mt-10 grid gap-0 lg:mt-14 lg:grid-cols-[0.42fr_1fr]">
            <div className="border-b py-5 lg:border-b-0 lg:border-r lg:py-0 lg:pr-10">
              <p className="eyebrow">Record states</p>
              <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">Inspect a state in the same workspace above. The visual changes, but the application does not disappear between steps.</p>
            </div>
            <ol className="divide-y lg:pl-10">
              {journeyNotes.map((note) => (
                <li key={note.stage}>
                  <button
                    type="button"
                    onClick={() => openHeroStage(note.stage)}
                    className="group grid w-full gap-4 border-l-2 border-transparent py-6 pl-3 text-left transition-[background-color,border-color,transform] duration-150 ease-out hover:translate-x-1 hover:border-primary/60 hover:bg-secondary/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transform-none motion-reduce:transition-none first:pt-5 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto] sm:items-start sm:gap-6"
                  >
                    <span className="font-mono text-xs font-semibold tracking-[0.12em] text-primary transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none">{note.number}</span>
                    <span>
                      <span className="block text-lg font-semibold tracking-[-0.025em] transition-colors duration-150 group-hover:text-primary motion-reduce:transition-none sm:text-xl">{note.title}</span>
                      <span className="mt-2 block max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">{note.copy}</span>
                    </span>
                    <span className="inline-flex min-h-10 items-center gap-1 self-start text-xs font-semibold text-primary underline-offset-4 group-hover:underline sm:justify-self-end">
                      Inspect <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none" aria-hidden="true" />
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="product" className="scroll-mt-24 border-b bg-secondary/25" aria-labelledby="contract-title">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                <p className="eyebrow text-primary">A product contract</p>
              </div>
              <h2 id="contract-title" className="mt-4 text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">A working record should make its boundaries visible.</h2>
              <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">The application surface distinguishes stored facts, user decisions, and guidance so that a helpful interface never blurs into an unsupported claim.</p>
            </div>
            <div className="divide-y border-y">
              <ContractRow icon={<Check className="h-3.5 w-3.5" aria-hidden="true" />} label="External opportunity source and listing fields" status="Recorded" tone="recorded" />
              <ContractRow icon={<Check className="h-3.5 w-3.5" aria-hidden="true" />} label="Evidence or CV content you provide" status="Recorded" tone="recorded" />
              <ContractRow icon={<Circle className="h-3 w-3 fill-current" aria-hidden="true" />} label="Stage, next action, and outcome" status="User controlled" tone="controlled" />
              <ContractRow icon={<FileText className="h-3.5 w-3.5" aria-hidden="true" />} label="Fit, CV, and interview suggestions" status="Guidance" tone="guidance" />
              <ContractRow icon={<Mic2 className="h-3.5 w-3.5" aria-hidden="true" />} label="Verification, ATS success, and external outcome" status="Not claimed" tone="notClaimed" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function ContractRow({ icon, label, status, tone }: { icon: ReactNode; label: string; status: string; tone: "recorded" | "controlled" | "guidance" | "notClaimed" }) {
  const toneClass = {
    recorded: "text-success",
    controlled: "text-primary",
    guidance: "text-foreground",
    notClaimed: "text-muted-foreground",
  }[tone];

  return (
    <div className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6">
      <div className="flex items-center gap-2 text-sm font-medium"><span className={toneClass}>{icon}</span>{label}</div>
      <span className={`text-xs font-semibold uppercase tracking-[0.1em] ${toneClass}`}>{status}</span>
    </div>
  );
}

export { APPLICATION_STAGES };
