import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import syncareerLogo from "@/assets/syncareer-logo.svg";

interface LandingHeaderProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

const NAV = [
  { label: "How it works", href: "#how" },
  { label: "What you get", href: "#tracks" },
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
      {/* Header */}
      <header
        className={`sticky top-0 z-50 bg-[#f7f5ef] transition-all duration-300 ${
          scrolled ? "border-b border-black/10 shadow-sm" : "border-b border-black/5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 shrink-0">
            <img src={syncareerLogo} alt="Syncareer logo" className="h-7 w-7" />
            <span className="text-[#0a1512] font-semibold tracking-tight text-lg">
              Syncareer
            </span>
          </button>

          <nav className="hidden lg:flex items-center gap-1">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="px-3 py-2 text-sm text-[#0a1512]/70 hover:text-[#0a1512] transition-colors rounded-full"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={onSignIn}
              className="hidden sm:inline-flex h-9 px-4 items-center text-sm text-[#0a1512]/80 hover:text-[#0a1512] transition-colors"
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
              className="lg:hidden h-9 w-9 grid place-items-center text-[#0a1512]/80 hover:text-[#0a1512]"
              aria-label="Toggle menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="lg:hidden border-t border-black/10 bg-[#f7f5ef]">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="py-3 text-[#0a1512]/80 hover:text-[#0a1512] border-b border-black/10"
                >
                  {item.label}
                </a>
              ))}
              <button
                onClick={() => {
                  onSignIn();
                  setOpen(false);
                }}
                className="py-3 text-left text-[#0a1512]/80 hover:text-[#0a1512]"
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
