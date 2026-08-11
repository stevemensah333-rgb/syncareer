import {
  BriefcaseBusiness,
  CheckCircle2,
  FileCheck2,
  Mic2,
  ShieldCheck,
  Bookmark,
  Sparkles,
  UserCheck,
  FileText,
} from "lucide-react";

const capabilities = [
  {
    step: "01",
    icon: BriefcaseBusiness,
    title: "Find and save a real external role",
    copy: "Inspect source, organisation, location, level, recency, and known deadlines without invented salary or verification claims.",
    uiSnippet: {
      label: "Opportunity record",
      content: "Source: External listing · Accra · Entry level · Known deadline",
    },
  },
  {
    step: "02",
    icon: FileCheck2,
    title: "Build truthful evidence",
    copy: "Compare listed requirements with evidence you actually have, then improve a role-specific CV without fabricating experience.",
    uiSnippet: {
      label: "Evidence check",
      content: "Requirement: SQL · Project evidence validated · No automatic fabrication",
    },
  },
  {
    step: "03",
    icon: Mic2,
    title: "Prepare and track",
    copy: "Practise with role context, record the next action, and update stage or outcome only when it actually changes.",
    uiSnippet: {
      label: "Active application",
      content: "Stage: Interview Practice · Next action: Follow up Friday",
    },
  },
];

const trustFeatures = [
  {
    badge: "Provenance",
    icon: Bookmark,
    title: "Source labels",
    copy: "External opportunities retain the stored source and original link when available; they are not independently verified.",
  },
  {
    badge: "Deterministic",
    icon: FileText,
    title: "Deterministic CV guidance",
    copy: "Completion and evidence checks examine entered content. They do not guarantee applicant-tracking-system success.",
  },
  {
    badge: "AI Boundary",
    icon: Sparkles,
    title: "Bounded AI",
    copy: "Generated suggestions remain proposals, use only supplied context, and may be inaccurate. You decide whether to use them.",
  },
  {
    badge: "User Controlled",
    icon: UserCheck,
    title: "Recorded outcomes",
    copy: "Application stages, external submissions, next actions, and outcomes change only through deliberate user actions.",
  },
];

export default function ProductStory() {
  return (
    <>
      <section
        id="product"
        className="scroll-mt-24 border-b bg-background"
        aria-labelledby="capabilities-title"
      >
        <div className="mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="mb-12 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Evidence-based workflow
            </p>
            <h2
              id="capabilities-title"
              className="mt-2 text-balance text-3xl font-semibold tracking-[-0.035em] sm:text-4xl"
            >
              What Syncareer helps you do.
            </h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Every step in Syncareer is intentionally designed around real evidence,
              source transparency, and user-controlled tracking.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {capabilities.map(({ step, icon: Icon, title, copy, uiSnippet }) => (
              <article
                key={title}
                className="flex flex-col justify-between rounded-xl border bg-card p-6 shadow-sm sm:p-7"
              >
                <div>
                  <div className="flex items-center justify-between border-b pb-4">
                    <span className="text-xs font-semibold tracking-wider text-muted-foreground">
                      STEP {step}
                    </span>
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-foreground">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {copy}
                  </p>
                </div>
                <div className="mt-6 rounded-lg border border-border/80 bg-muted/40 p-3.5 text-xs">
                  <p className="font-semibold text-foreground">{uiSnippet.label}</p>
                  <p className="mt-1 text-muted-foreground">{uiSnippet.content}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="method"
        className="scroll-mt-24 border-b bg-secondary/30"
        aria-labelledby="method-title"
      >
        <div className="mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="mb-12 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>Built for trust</span>
            </div>
            <h2
              id="method-title"
              className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl"
            >
              We tell you what&apos;s real and what&apos;s a suggestion.
            </h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Syncareer supports your judgement; it does not replace it. Every
              signal in the platform is clearly bounded.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {trustFeatures.map(({ badge, icon: Icon, title, copy }) => (
              <div
                key={title}
                className="flex flex-col justify-between rounded-xl border bg-card p-6 shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 text-[11px] font-medium text-secondary-foreground">
                      <Icon className="h-3 w-3 text-primary" aria-hidden="true" />
                      {badge}
                    </span>
                    <CheckCircle2
                      className="h-4 w-4 text-success"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-foreground">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {copy}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
