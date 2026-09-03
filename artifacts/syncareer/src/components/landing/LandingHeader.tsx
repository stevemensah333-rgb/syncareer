import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import syncareerLogo from "@/assets/syncareer-logo.svg";

interface LandingHeaderProps {
  onSignIn: () => void;
  onSignUp: () => void;
  primaryActionLabel?: string;
}

const NAV = [
  { label: "How it works", href: "/#workflow" },
  { label: "Product", href: "/#product" },
];

export default function LandingHeader({
  onSignIn,
  onSignUp,
  primaryActionLabel = "Get started",
}: LandingHeaderProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  // Track scroll position for subtle header shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const focusable = Array.from(
      mobileNavRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [],
    );
    focusable[0]?.focus();
    const manageMenuFocus = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", manageMenuFocus);
    return () => window.removeEventListener("keydown", manageMenuFocus);
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 transition-shadow duration-200 ${
        scrolled ? "shadow-[0_1px_3px_0_rgba(16,24,40,0.04)]" : ""
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex min-h-11 items-center gap-2 rounded-md" aria-label="Syncareer home">
          <img src={syncareerLogo} alt="" className="h-7 w-7" />
          <span className="text-lg font-semibold tracking-tight">Syncareer</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={onSignIn} className="hidden sm:inline-flex">
            Sign in
          </Button>
          <Button size="sm" onClick={onSignUp} className="hidden sm:inline-flex">
            {primaryActionLabel}
          </Button>
          <Button
            ref={menuButtonRef}
            variant="ghost"
            size="icon"
            onClick={() => setOpen((value) => !value)}
            className="lg:hidden"
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={open}
            aria-controls="landing-mobile-navigation"
          >
            {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </Button>
        </div>
      </div>

      {open && (
        <div ref={mobileNavRef} id="landing-mobile-navigation" className="border-t bg-card lg:hidden">
          <nav className="mx-auto flex w-full max-w-[1400px] flex-col px-4 py-3 sm:px-6" aria-label="Mobile navigation">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center border-b text-sm font-medium text-foreground last:border-b-0"
              >
                {item.label}
              </a>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  onSignIn();
                }}
              >
                Sign in
              </Button>
              <Button
                onClick={() => {
                  setOpen(false);
                  onSignUp();
                }}
              >
                {primaryActionLabel}
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
