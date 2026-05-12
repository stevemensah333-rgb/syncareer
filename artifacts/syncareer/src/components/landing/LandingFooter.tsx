import { useNavigate } from "react-router-dom";
import syncareerLogo from "@/assets/syncareer-logo.svg";

export default function LandingFooter() {
  const navigate = useNavigate();

  return (
    <footer className="relative border-t border-foreground/10">
      <div className="container mx-auto px-6 pt-20 pb-10 max-w-6xl">
        {/* Editorial wordmark */}
        <div className="flex items-center gap-3 mb-14">
          <img src={syncareerLogo} alt="" className="h-10 w-10" />
          <span className="font-sans text-3xl md:text-4xl font-semibold tracking-tight text-foreground leading-none">
            Syncareer
          </span>
        </div>

        <div className="grid md:grid-cols-[2fr_1fr_1fr] gap-12 pt-10 border-t border-foreground/10">
          <div>
            <p className="text-base text-foreground/65 max-w-sm leading-relaxed">
              AI-powered career intelligence for African students and recent
              graduates.
            </p>
            <a
              href="mailto:hello@syncareer.me"
              className="mt-5 inline-block text-sm font-medium text-primary hover:underline underline-offset-4"
            >
              hello@syncareer.me
            </a>
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/50 mb-4">
              Product
            </p>
            <ul className="space-y-3 text-sm">
              <li>
                <button
                  onClick={() => navigate("/assessment")}
                  className="text-foreground/75 hover:text-foreground transition-colors"
                >
                  Assessment
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate("/cv-builder")}
                  className="text-foreground/75 hover:text-foreground transition-colors"
                >
                  CV Builder
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate("/pricing")}
                  className="text-foreground/75 hover:text-foreground transition-colors"
                >
                  Pricing
                </button>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/50 mb-4">
              Company
            </p>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="/terms" className="text-foreground/75 hover:text-foreground transition-colors">
                  Terms
                </a>
              </li>
              <li>
                <a href="/privacy" className="text-foreground/75 hover:text-foreground transition-colors">
                  Privacy
                </a>
              </li>
              <li>
                <a href="/blog" className="text-foreground/75 hover:text-foreground transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a
                  href="https://www.instagram.com/syncareer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground/75 hover:text-foreground transition-colors"
                >
                  Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-foreground/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-foreground/55">
          <p>© {new Date().getFullYear()} Syncareer. All rights reserved.</p>
          <p>Made for African graduates.</p>
        </div>
      </div>
    </footer>
  );
}
