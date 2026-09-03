import { Link } from "react-router-dom";
import syncareerLogo from "@/assets/syncareer-logo.svg";

interface FooterGroup {
  title: string;
  links: Array<{ label: string; href: string; external?: boolean }>;
}

const FOOTER_GROUPS: FooterGroup[] = [
  {
    title: "Product",
    links: [
      { label: "Opportunities", href: "/opportunities" },
      { label: "Applications", href: "/applications" },
      { label: "CV Builder", href: "/cv-builder" },
      { label: "Interview practice", href: "/interview-simulator" },
      { label: "Career assessment", href: "/assessment" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Contact", href: "mailto:hello@syncareer.me", external: true },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
      { label: "Unsubscribe", href: "/unsubscribe" },
    ],
  },
];

export default function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-background" aria-labelledby="footer-brand">
      <div className="mx-auto w-full max-w-[1400px] px-4 pb-8 pt-14 sm:px-6 lg:px-8 lg:pt-16">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1.8fr] lg:gap-20">
          <div className="max-w-sm">
            <Link to="/" className="inline-flex items-center gap-2 rounded-md" aria-label="Syncareer home">
              <img src={syncareerLogo} alt="" className="h-8 w-8" />
              <span id="footer-brand" className="text-xl font-semibold tracking-tight">Syncareer</span>
            </Link>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              An opportunity-first career workspace for African graduates building stronger, evidence-based applications.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {FOOTER_GROUPS.map((group) => (
              <div key={group.title}>
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{group.title}</h2>
                <ul className="mt-4 space-y-3 text-sm">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      {link.external ? (
                        <a
                          href={link.href}
                          className="text-muted-foreground transition-colors duration-150 hover:text-foreground"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          to={link.href}
                          className="text-muted-foreground transition-colors duration-150 hover:text-foreground"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Syncareer. All rights reserved.</p>
          <p>Built for the work between finding a role and recording the outcome.</p>
        </div>
      </div>
    </footer>
  );
}
