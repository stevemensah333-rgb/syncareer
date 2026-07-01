import { useNavigate } from "react-router-dom";
import syncareerLogo from "@/assets/syncareer-logo.svg";

export default function LandingFooter() {
  const navigate = useNavigate();
  const year = new Date().getFullYear();

  const cols: { title: string; links: { label: string; onClick?: () => void; href?: string; external?: boolean }[] }[] = [
    {
      title: "Product",
      links: [
        { label: "Assessment", onClick: () => navigate("/assessment") },
        { label: "CV Builder", onClick: () => navigate("/cv-builder") },
        { label: "Interview Simulator", onClick: () => navigate("/interview-simulator") },
        { label: "Counsellors", onClick: () => navigate("/counsellors") },
        { label: "Pricing", onClick: () => navigate("/pricing") },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "Blog", href: "/blog" },
        { label: "Contact", href: "mailto:hello@syncareer.me" },
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
    {
      title: "Social",
      links: [
        { label: "Instagram", href: "https://www.instagram.com/syncareer", external: true },
        { label: "LinkedIn", href: "https://linkedin.com/company/syncareer", external: true },
      ],
    },
  ];

  return (
    <footer className="relative bg-[#070f0d] text-white border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-10">
        <div className="grid lg:grid-cols-[1.5fr_repeat(4,1fr)] gap-10">
          <div>
            <div className="flex items-center gap-2">
              <img src={syncareerLogo} alt="" className="h-8 w-8" />
              <span className="text-xl font-semibold tracking-tight">
                Syncareer
              </span>
            </div>
            <p className="mt-5 text-sm text-white/60 max-w-xs leading-relaxed">
              AI-powered career intelligence for African students and recent
              graduates.
            </p>
            <a
              href="mailto:hello@syncareer.me"
              className="mt-5 inline-block text-sm font-medium text-[#00c4cc] hover:text-white transition-colors"
            >
              hello@syncareer.me
            </a>
          </div>

          {cols.map((col) => (
            <div key={col.title}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50 mb-4">
                {col.title}
              </p>
              <ul className="space-y-3 text-sm">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.onClick ? (
                      <button
                        onClick={l.onClick}
                        className="text-white/70 hover:text-white transition-colors"
                      >
                        {l.label}
                      </button>
                    ) : (
                      <a
                        href={l.href}
                        {...(l.external
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                        className="text-white/70 hover:text-white transition-colors"
                      >
                        {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/50">
          <p>© {year} Syncareer. All rights reserved.</p>
          <p>Made for African graduates.</p>
        </div>
      </div>
    </footer>
  );
}
