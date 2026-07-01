import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, ArrowRight } from "lucide-react";
import syncareerLogo from "@/assets/syncareer-logo.svg";

interface LandingHeaderProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

const NAV = [
  { label: "Why", href: "#why" },
  { label: "How it works", href: "#how" },
  { label: "What you get", href: "#tracks" },
  { label: "Stories", href: "#stories" },
  { label: "FAQs", href: "#faqs" },
];

export default function LandingHeader({ onSignIn, onSignUp }: LandingHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Announcement bar */}
      <div className="w-full bg-[#0a1512] border-b border-white/5 text-[13px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-11 flex items-center justify-between gap-4">
          <p className="text-white/70 truncate">
            <span className="hidden sm:inline">The free 5-minute career assessment is open — </span>
            <span className="sm:hidden">Free assessment open — </span>
            find a path that actually fits.
          </p>
          <button
            onClick={() => navigate("/assessment")}
            className="text-[#00c4cc] hover:text-white transition-colors font-medium whitespace-nowrap inline-flex items-center gap-1"
          >
            Start now <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Header */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#0a1512]/85 backdrop-blur-md border-b border-white/5"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 shrink-0">
            <img src={syncareerLogo} alt="Syncareer" className="h-7 w-7" />
            <span className="text-white font-semibold tracking-tight text-lg">
              Syncareer
            </span>
          </button>

          <nav className="hidden lg:flex items-center gap-1">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="px-3 py-2 text-sm text-white/70 hover:text-white transition-colors rounded-full"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={onSignIn}
              className="hidden sm:inline-flex h-9 px-4 items-center text-sm text-white/80 hover:text-white transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate("/assessment")}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#00c4cc] text-[#0a1512] px-4 text-sm font-semibold hover:bg-[#33d4da] transition-colors shadow-[0_0_0_1px_rgba(0,196,204,0.4),0_10px_30px_-10px_rgba(0,196,204,0.5)]"
            >
              Start free
            </button>
            <button
              onClick={() => setOpen(!open)}
              className="lg:hidden h-9 w-9 grid place-items-center text-white/80 hover:text-white"
              aria-label="Toggle menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="lg:hidden border-t border-white/5 bg-[#0a1512]">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="py-3 text-white/80 hover:text-white border-b border-white/5"
                >
                  {item.label}
                </a>
              ))}
              <button
                onClick={() => {
                  onSignIn();
                  setOpen(false);
                }}
                className="py-3 text-left text-white/80 hover:text-white"
              >
                Sign in
              </button>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
