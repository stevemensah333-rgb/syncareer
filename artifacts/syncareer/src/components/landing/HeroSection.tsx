import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  MapPin,
  Mic,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  onGetStarted: () => void;
  onAssessment: () => void;
}

const journey = [
  { label: "Applied", state: "current" },
  { label: "In review", state: "upcoming" },
  { label: "Interview", state: "upcoming" },
  { label: "Offer", state: "upcoming" },
  { label: "Outcome", state: "upcoming" },
];

/**
 * Product-led hero. The interface composition mirrors the real opportunity,
 * CV, interview, and application states without pretending to be live data.
 */
export default function HeroSection({ onGetStarted, onAssessment }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden border-b" aria-labelledby="landing-hero-title">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-[38rem] bg-[radial-gradient(circle_at_82%_12%,hsl(var(--info)/0.09),transparent_38%),radial-gradient(circle_at_8%_30%,hsl(var(--primary)/0.08),transparent_34%)]"
      />

      <div className="mx-auto grid w-full max-w-[1400px] gap-12 px-4 pb-16 pt-14 sm:px-6 md:pb-24 md:pt-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16 lg:px-8 lg:pb-28 lg:pt-24">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1.5 text-xs font-semibold text-primary">
            <BriefcaseBusiness className="h-3.5 w-3.5" aria-hidden="true" />
            Opportunity-first career workspace
          </div>

          <h1
            id="landing-hero-title"
            className="mt-6 text-balance text-[2.55rem] font-semibold leading-[1.03] tracking-[-0.045em] text-foreground sm:text-5xl md:text-6xl"
          >
            Turn a real opportunity into a stronger, evidence-based application.
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Syncareer helps African graduates move from a role they care about to a tailored CV,
            focused interview practice, and a clear application record—without losing the facts
            that matter along the way.
          </p>

          <div className="mt-8 flex flex-col gap-2 sm:flex-row">
            <Button size="lg" onClick={onGetStarted} className="min-h-12 w-full gap-2 px-6 sm:w-auto">
              Explore real opportunities
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button size="lg" variant="outline" onClick={onAssessment} className="min-h-12 w-full px-6 sm:w-auto">Still choosing? Explore interests</Button>
          </div>

          <ul className="mt-7 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2" aria-label="Product foundations">
            {[
              "Source-labelled opportunities",
              "Role-specific preparation",
              "Deterministic CV guidance",
              "User-recorded application outcomes",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <figure className="min-w-0" aria-labelledby="hero-product-preview-caption">
          <figcaption
            id="hero-product-preview-caption"
            className="mb-3 flex items-center justify-between gap-3 text-xs text-muted-foreground"
          >
            <span className="font-medium text-foreground">Inside Syncareer</span>
            <span>Illustrative product state</span>
          </figcaption>
          <div className="overflow-hidden rounded-2xl border bg-card shadow-[0_24px_70px_-38px_hsl(var(--secondary)/0.45)]">
            <div className="flex h-11 items-center gap-2 border-b px-4">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive/65" aria-hidden="true" />
              <span className="h-2.5 w-2.5 rounded-full bg-warning/70" aria-hidden="true" />
              <span className="h-2.5 w-2.5 rounded-full bg-success/70" aria-hidden="true" />
              <span className="ml-2 text-[11px] font-medium text-muted-foreground">Application workspace</span>
            </div>

            <div className="grid min-h-[430px] sm:grid-cols-[64px_1fr]">
              <div className="hidden border-r bg-background/70 py-4 sm:block" aria-hidden="true">
                <div className="space-y-2 px-2">
                  {[LayoutDashboard, BriefcaseBusiness, FileText, Mic].map((Icon, index) => (
                    <span
                      key={index}
                      className={`mx-auto grid h-10 w-10 place-items-center rounded-lg ${
                        index === 1 ? "bg-primary/10 text-primary" : "text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                  ))}
                </div>
              </div>

              <div className="min-w-0 bg-background/45 p-3 sm:p-4 md:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                      Continue your application
                    </p>
                    <h2 className="mt-1 text-lg font-semibold tracking-tight">Graduate Analyst</h2>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" aria-hidden="true" /> Example role
                      </span>
                      <span>Entry level</span>
                    </p>
                  </div>
                  <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                    Applied
                  </span>
                </div>

                <div className="mt-5 rounded-xl border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium">Application journey</p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-1 text-[10px] font-medium text-warning">
                      <CalendarClock className="h-3 w-3" aria-hidden="true" /> Deadline listed
                    </span>
                  </div>
                  <ol className="mt-4 grid grid-cols-5 gap-1" aria-label="Example application progress">
                    {journey.map((item, index) => (
                      <li key={item.label} className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                              item.state === "complete"
                                ? "bg-primary"
                                : item.state === "current"
                                  ? "bg-success ring-4 ring-success/15"
                                  : "bg-muted-foreground/25"
                            }`}
                            aria-hidden="true"
                          />
                          {index < journey.length - 1 && (
                            <span className={`h-px flex-1 ${item.state === "complete" ? "bg-primary" : "bg-border"}`} aria-hidden="true" />
                          )}
                        </div>
                        <p className={`mt-2 truncate text-[10px] ${item.state === "current" ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                          {item.label}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-primary/20 bg-primary/[0.045] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">Recommended next step</p>
                    <p className="mt-2 text-sm font-semibold">Prepare for the role</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Use the saved role context to review your CV and set up interview practice.
                    </p>
                  </div>
                  <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                        <FileText className="h-3.5 w-3.5 text-info" aria-hidden="true" /> Primary CV
                      </span>
                      <span className="text-[11px] font-semibold tabular-nums">72%</span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                      <div className="h-full w-[72%] rounded-full bg-success" />
                    </div>
                    <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Sparkles className="h-3 w-3 text-info" aria-hidden="true" /> Evidence checks available
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </figure>
      </div>
    </section>
  );
}
