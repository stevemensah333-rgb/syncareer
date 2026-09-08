import homeShot from "@/assets/pf-home.jpg.asset.json";
import opportunitiesShot from "@/assets/pf-opportunities.jpg.asset.json";
import cvShot from "@/assets/pf-cv.jpg.asset.json";
import AnimatedSection from "./AnimatedSection";

const supporting = [
  {
    src: homeShot.url,
    alt: "Syncareer home screen showing one focused next step and work already in progress.",
    caption: "Home — one focused next step",
  },
  {
    src: cvShot.url,
    alt: "Syncareer CV Builder showing the section outline, personal details form and completion checklist.",
    caption: "CV Builder — sections and completion",
  },
];

export default function WorkspacePreview() {
  return (
    <AnimatedSection>
      <section id="workspace-preview" className="scroll-mt-24 border-b bg-card" aria-labelledby="workspace-preview-title">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <p className="brand-eyebrow">The actual workspace</p>
            <h2
              id="workspace-preview-title"
              className="mt-4 text-balance text-3xl font-semibold tracking-[-0.035em] sm:text-4xl"
            >
              This is what you get after signing up.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Real screens from Syncareer — opportunities ordered around your major and skills, a CV you keep
              improving, and applications you can move through to an outcome.
            </p>
          </div>

          <figure className="mt-10 overflow-hidden rounded-surface border bg-background shadow-[0_28px_70px_-42px_hsl(var(--foreground)/0.42)]">
            <img
              src={opportunitiesShot.url}
              alt="Syncareer opportunities screen with a searchable feed on the left and the selected role, fit reasons and checks on the right."
              width={1920}
              height={1040}
              loading="lazy"
              decoding="async"
              className="block w-full"
            />
            <figcaption className="border-t px-4 py-3 text-xs text-muted-foreground sm:px-5">
              Opportunities — why a role fits, and what to check before applying
            </figcaption>
          </figure>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {supporting.map((shot) => (
              <figure key={shot.caption} className="overflow-hidden rounded-surface border bg-background">
                <img
                  src={shot.src}
                  alt={shot.alt}
                  width={1920}
                  height={1040}
                  loading="lazy"
                  decoding="async"
                  className="block w-full"
                />
                <figcaption className="border-t px-4 py-3 text-xs text-muted-foreground">{shot.caption}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    </AnimatedSection>
  );
}
