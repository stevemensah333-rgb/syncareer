import {
  ArrowRight,
  Bookmark,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  ExternalLink,
  FileCheck2,
  FileText,
  Gauge,
  ListChecks,
  MessageSquareText,
  Mic2,
  NotebookPen,
  Search,
  ShieldCheck,
  Target,
  UserCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

function SectionIntro({
  eyebrow,
  title,
  description,
  titleId,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  description: string;
  titleId?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-2xl"}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
      <h2 id={titleId} className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
        {description}
      </p>
    </div>
  );
}

const problemCards: Array<{ icon: LucideIcon; title: string; copy: string; tone: string }> = [
  {
    icon: Search,
    title: "The posting is dense",
    copy: "Requirements, deadlines, location, source, and skill signals are easy to miss when they live across tabs and screenshots.",
    tone: "bg-primary/10 text-primary",
  },
  {
    icon: FileText,
    title: "Your evidence is scattered",
    copy: "Internships, national service, projects, volunteering, and campus leadership may be relevant—but only when you state what you actually did.",
    tone: "bg-success/10 text-success",
  },
  {
    icon: MessageSquareText,
    title: "Preparation becomes generic",
    copy: "A general CV or rehearsed answer can miss the language, skills, and decisions that are specific to the role in front of you.",
    tone: "bg-info/10 text-info",
  },
];

function ProblemSection() {
  return (
    <section className="border-b bg-card" aria-labelledby="problem-title">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-20 sm:px-6 md:py-24 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">The application gap</p>
            <h2 id="problem-title" className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">
              Finding a role is not the same as building a case for it.
            </h2>
          </div>
          <p className="max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8 lg:justify-self-end">
            Early-career applicants are often asked for experience before they have learned how to
            recognise and communicate the evidence already present in their work, study, and service.
            Syncareer keeps the real opportunity at the centre of that work.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {problemCards.map(({ icon: Icon, title, copy, tone }) => (
            <article key={title} className="rounded-xl border bg-background/45 p-5 sm:p-6">
              <span className={`grid h-10 w-10 place-items-center rounded-lg ${tone}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const workflowSteps = [
  {
    number: "01",
    title: "Choose a real opportunity",
    copy: "Browse a listing, inspect the source, role facts, stored skills, and any listed deadline.",
  },
  {
    number: "02",
    title: "Save the context",
    copy: "Keep the role available while you compare its skills with your profile and decide whether to apply.",
  },
  {
    number: "03",
    title: "Tailor your evidence",
    copy: "Open your primary CV with the role, organisation, and skills in context; add only evidence that is accurate.",
  },
  {
    number: "04",
    title: "Apply and start tracking",
    copy: "Apply on the original source when needed, then record that you applied to create a workspace for the application.",
  },
  {
    number: "05",
    title: "Prepare and update",
    copy: "Practise for that role, keep notes, update the stage, and record the eventual outcome yourself.",
  },
];

function WorkflowSection() {
  return (
    <section id="workflow" className="scroll-mt-24 border-b" aria-labelledby="workflow-title">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-20 sm:px-6 md:py-24 lg:px-8">
        <SectionIntro
          eyebrow="Opportunity to outcome"
          title="One thread from role discovery to your recorded result."
          titleId="workflow-title"
          description="The workspace is organised around the application—not a collection of disconnected tools. Each step preserves enough context to make the next one more specific."
          align="center"
        />

        <ol className="mt-12 grid gap-3 md:grid-cols-5" aria-label="Syncareer application workflow">
          {workflowSteps.map((step, index) => (
            <li key={step.number} className="relative rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold tabular-nums text-primary">{step.number}</span>
                {index < workflowSteps.length - 1 && (
                  <ArrowRight className="hidden h-4 w-4 text-border md:block" aria-hidden="true" />
                )}
              </div>
              <h3 className="mt-8 text-base font-semibold leading-snug">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.copy}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function WorkspacePreview() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-[0_20px_55px_-40px_hsl(var(--secondary)/0.45)]">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Example workspace</p>
          <h3 className="mt-1 font-semibold">Graduate Data Analyst</h3>
        </div>
        <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
          Applied
        </span>
      </div>

      <div className="grid lg:grid-cols-[0.86fr_1.14fr]">
        <div className="border-b bg-background/45 p-4 sm:p-5 lg:border-b-0 lg:border-r">
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-1 text-[10px] font-medium text-warning">
                <CalendarClock className="h-3 w-3" aria-hidden="true" /> Deadline listed
              </span>
            </div>
            <p className="mt-4 text-sm font-semibold">Opportunity facts</p>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Experience</dt>
                <dd className="font-medium">Entry level</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Listing source</dt>
                <dd className="inline-flex items-center gap-1 font-medium text-primary">
                  External source <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Stored skills</dt>
                <dd className="font-medium">3 listed</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {["SQL", "Excel", "Data visualisation"].map((skill) => (
                <span key={skill} className="rounded-full border bg-background px-2 py-1 text-[10px] text-muted-foreground">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-warning/25 bg-warning/[0.06] p-3 text-[11px] leading-5 text-muted-foreground">
            External listings are not independently verified by Syncareer. Confirm the role,
            requirements, and deadline on the original posting.
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Where you are</p>
          <ol className="mt-4 flex items-start gap-1" aria-label="Example tracked application stages">
            {["Applied", "In review", "Interview", "Offer", "Outcome"].map((stage, index) => (
              <li key={stage} className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      index === 0 ? "bg-primary ring-4 ring-primary/15" : "bg-muted-foreground/25"
                    }`}
                    aria-hidden="true"
                  />
                  {index < 4 && <span className="h-px flex-1 bg-border" aria-hidden="true" />}
                </div>
                <p className={`mt-2 truncate text-[9px] sm:text-[10px] ${index === 0 ? "font-semibold" : "text-muted-foreground"}`}>
                  {stage}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-5 rounded-xl border border-primary/20 bg-primary/[0.045] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">Recommended next step</p>
            <p className="mt-2 text-sm font-semibold">Review your targeted CV</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Confirm the evidence and skills you want this application to emphasise before you prepare for interview questions.
            </p>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <p className="inline-flex items-center gap-1.5 text-xs font-medium">
                <FileText className="h-3.5 w-3.5 text-info" aria-hidden="true" /> Primary CV
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">Last saved version shown</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="inline-flex items-center gap-1.5 text-xs font-medium">
                <Mic2 className="h-3.5 w-3.5 text-success" aria-hidden="true" /> Interview practice
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">Role context ready</p>
            </div>
          </div>

          <div className="mt-3 rounded-lg border p-3">
            <p className="inline-flex items-center gap-1.5 text-xs font-medium">
              <NotebookPen className="h-3.5 w-3.5 text-warning" aria-hidden="true" /> Application notes
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Keep follow-up dates, contacts, and details you want to remember.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkspaceSection() {
  return (
    <section id="workspace" className="scroll-mt-24 border-b bg-card" aria-labelledby="workspace-title">
      <div className="mx-auto grid w-full max-w-[1400px] gap-12 px-4 py-20 sm:px-6 md:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Application workspace</p>
          <h2 id="workspace-title" className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">
            The role, your next action, and your record stay together.
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Save an opportunity or mark it applied, then use the tracker to keep the stage,
            deadline, CV context, practice entry point, notes, and outcome in one place.
          </p>
          <ul className="mt-7 space-y-4">
            {[
              [Bookmark, "Save before you commit", "Hold onto a role while you review its facts and decide whether to apply."],
              [ClipboardCheck, "Record the stage yourself", "The journey reflects the status you enter; it does not guess what an employer has done."],
              [Target, "See a concrete next step", "Recommendations point back to the CV, interview, source, or status action relevant to the record."],
            ].map(([Icon, title, copy]) => {
              const ItemIcon = Icon as LucideIcon;
              return (
                <li key={title as string} className="flex gap-3">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <ItemIcon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{title as string}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy as string}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <WorkspacePreview />
      </div>
    </section>
  );
}

function CvPreview() {
  const qualityRows = [
    ["Content quality", "20/30"],
    ["Skills coverage", "12/20"],
    ["Presentation", "14/20"],
    ["Evidence", "18/30"],
  ];
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-[0_20px_55px_-40px_hsl(var(--secondary)/0.45)] sm:p-6">
      <div className="flex items-center justify-between gap-3 border-b pb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Illustrative CV state</p>
          <h3 className="mt-1 font-semibold">CV progress</h3>
        </div>
        <Gauge className="h-5 w-5 text-primary" aria-hidden="true" />
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Completion</p>
            <p className="text-xs text-muted-foreground">Meaningful information added</p>
          </div>
          <span className="text-2xl font-bold tabular-nums">75%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div className="h-full w-3/4 rounded-full bg-primary" />
        </div>
        <ul className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
          {[
            [true, "Personal details"],
            [true, "Education"],
            [false, "Experience"],
            [true, "Skills"],
          ].map(([complete, label]) => (
            <li key={label as string} className="flex items-center gap-2">
              {complete ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-muted-foreground/60" aria-hidden="true" />
              )}
              <span className={complete ? "text-foreground" : "text-muted-foreground"}>{label as string}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 border-t pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">CV quality</p>
            <p className="text-xs text-muted-foreground">Writing and evidence checks</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold tabular-nums text-warning">64<span className="text-xs font-normal text-muted-foreground">/100</span></p>
            <p className="text-[10px] font-medium text-warning">Developing</p>
          </div>
        </div>
        <dl className="mt-4 space-y-2">
          {qualityRows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 text-xs">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-5 rounded-xl border border-warning/25 bg-warning/[0.06] p-4">
        <p className="text-xs font-semibold">Next improvement</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Add measurable outcomes where they are accurate, and include a project or achievement as supporting evidence.
        </p>
      </div>
    </div>
  );
}

function CvSection() {
  return (
    <section className="border-b" aria-labelledby="cv-title">
      <div className="mx-auto grid w-full max-w-[1400px] gap-12 px-4 py-20 sm:px-6 md:py-24 lg:grid-cols-2 lg:items-center lg:px-8">
        <CvPreview />
        <div className="lg:pl-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Evidence-first CV assistance</p>
          <h2 id="cv-title" className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">
            Improve what is on the page—without inventing what is not.
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Build a structured CV, carry the target role and skills into the editor, preview the
            result, save your primary version, and export it as a PDF. Guidance is tied to the
            content you enter.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border bg-card p-5">
              <FileCheck2 className="h-5 w-5 text-success" aria-hidden="true" />
              <h3 className="mt-4 text-sm font-semibold">Completion is explicit</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Meaningful contact, education, experience, skills, projects, achievements, and activities contribute to completion.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <ListChecks className="h-5 w-5 text-info" aria-hidden="true" />
              <h3 className="mt-4 text-sm font-semibold">Quality checks are deterministic</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                The score checks writing and evidence patterns such as action verbs, accurate numbers, structure, and supporting experience.
              </p>
            </div>
          </div>
          <p className="mt-5 rounded-lg border border-info/20 bg-info/[0.055] px-4 py-3 text-xs leading-5 text-muted-foreground">
            Placeholders and default rows do not earn credit. CV quality guidance is not a prediction or guarantee that an applicant tracking system will accept a CV.
          </p>
        </div>
      </div>
    </section>
  );
}

function InterviewSetupPreview() {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-[0_20px_55px_-40px_hsl(var(--secondary)/0.45)] sm:p-6">
      <div className="flex items-center gap-3 border-b pb-4">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-info/10 text-info">
          <Mic2 className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="font-semibold">Voice interview setup</p>
          <p className="text-xs text-muted-foreground">Illustrative, role-specific state</p>
        </div>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["Target role", "Graduate Data Analyst"],
          ["Industry", "Technology"],
          ["Interview type", "Technical"],
          ["Session length", "Quick practice"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border bg-background/45 p-3">
            <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-xs font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3 text-xs">
          <span className="inline-flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Job description context
          </span>
          <span className="font-medium text-success">Added</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3 text-xs">
          <span className="inline-flex items-center gap-2">
            <FileCheck2 className="h-3.5 w-3.5 text-info" aria-hidden="true" /> CV context
          </span>
          <span className="font-medium text-success">Added</span>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-secondary px-4 py-3 text-center text-sm font-medium text-secondary-foreground">
        Start voice practice
      </div>
      <p className="mt-3 text-center text-[11px] text-muted-foreground">Premium feature · active access required</p>
    </div>
  );
}

function InterviewSection() {
  return (
    <section className="border-b bg-card" aria-labelledby="interview-title">
      <div className="mx-auto grid w-full max-w-[1400px] gap-12 px-4 py-20 sm:px-6 md:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Job-specific interview preparation</p>
          <h2 id="interview-title" className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">
            Practise for this role, not an imaginary average role.
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Configure voice practice with the role, industry, interview type, session length, job
            description, and CV context. The simulator uses that input to shape questions and feedback.
          </p>
          <ol className="mt-8 space-y-5">
            {[
              ["Set the brief", "Choose the role and interview format, then add the posting and CV context you want used."],
              ["Answer aloud", "Move through a voice-based practice conversation with follow-up questions."],
              ["Review the report", "Read per-question feedback, an overall summary, and suggested next steps after the session."],
            ].map(([title, copy], index) => (
              <li key={title} className="flex gap-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border bg-background text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-sm font-semibold">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-xs leading-5 text-muted-foreground">
            Questions and feedback are AI-generated and may be incomplete or inaccurate. Treat them as practice guidance, not an employer assessment.
          </p>
        </div>
        <InterviewSetupPreview />
      </div>
    </section>
  );
}

function GuidanceSection() {
  return (
    <section className="border-b" aria-labelledby="guidance-title">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-20 sm:px-6 md:py-24 lg:px-8">
        <div className="overflow-hidden rounded-2xl border border-info/20 bg-info/[0.045]">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
            <div className="p-6 sm:p-8 lg:p-10">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-info/10 text-info">
                <UserCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-info">Human guidance, when available</p>
              <h2 id="guidance-title" className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">
                Self-serve tools first. A person when the in-app supply exists.
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                Signed-in students can use the in-app counsellor flow to look for a published profile
                and request an available session. Availability is not guaranteed and can vary by account and time.
              </p>
            </div>

            <div className="border-t bg-card/75 p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
              <h3 className="text-sm font-semibold">What “available” means in the product</h3>
              <ul className="mt-5 space-y-4">
                {[
                  "Only counsellor profiles returned by the live directory can be shown.",
                  "A session can be requested only against a date and time the counsellor has published.",
                  "Requests begin as pending and still need the counsellor's response.",
                  "The interface may show no counsellors or no open time slots.",
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-6 rounded-lg border bg-background/70 p-4 text-xs leading-5 text-muted-foreground">
                There is no public counsellor directory route on the landing page. This option appears inside the authenticated product where availability can be checked honestly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const methodCards: Array<{ icon: LucideIcon; title: string; copy: string; note: string; tone: string }> = [
  {
    icon: Target,
    title: "Career assessment",
    copy: "RIASEC category results are calculated from the answers using fixed scoring rules.",
    note: "A starting point for exploration—not a diagnosis or hiring decision.",
    tone: "bg-info/10 text-info",
  },
  {
    icon: Gauge,
    title: "Skill comparison",
    copy: "A match percentage compares stored opportunity skills with skills on the user's profile.",
    note: "It is not the probability of getting an interview or offer.",
    tone: "bg-primary/10 text-primary",
  },
  {
    icon: FileCheck2,
    title: "CV guidance",
    copy: "Completion and quality use deterministic checks against meaningful entered content.",
    note: "They do not predict applicant tracking system acceptance.",
    tone: "bg-success/10 text-success",
  },
  {
    icon: ShieldCheck,
    title: "Opportunity provenance",
    copy: "The workspace surfaces the stored source and original posting link where one is available.",
    note: "External listings are not independently verified by Syncareer.",
    tone: "bg-warning/10 text-warning",
  },
];

function MethodSection() {
  return (
    <section id="method" className="scroll-mt-24 border-b bg-card" aria-labelledby="method-title">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-20 sm:px-6 md:py-24 lg:px-8">
        <SectionIntro
          eyebrow="Trust and methodology"
          title="Clear signals, visible limits, and no hiring guarantees."
          titleId="method-title"
          description="Different parts of Syncareer use different methods. The product should tell you what a number or recommendation means—and what it does not mean."
          align="center"
        />

        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {methodCards.map(({ icon: Icon, title, copy, note, tone }) => (
            <article key={title} className="rounded-xl border bg-background/40 p-5 sm:p-6">
              <span className={`grid h-10 w-10 place-items-center rounded-lg ${tone}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-base font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-foreground/80">{copy}</p>
              <p className="mt-3 border-t pt-3 text-xs leading-5 text-muted-foreground">{note}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/[0.045] p-5 sm:flex-row sm:items-start sm:gap-4">
          <ShieldCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h3 className="text-sm font-semibold">Your judgement remains part of the process</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Confirm posting facts at the source, keep CV statements accurate, review generated guidance critically, and record application stages and outcomes based on what actually happened.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ProductStory() {
  return (
    <>
      <ProblemSection />
      <WorkflowSection />
      <WorkspaceSection />
      <CvSection />
      <InterviewSection />
      <GuidanceSection />
      <MethodSection />
    </>
  );
}
