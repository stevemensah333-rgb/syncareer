import { useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Home, Sparkles, Tag, LogIn, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import syncareerLogo from "@/assets/syncareer-logo.svg";

interface LandingHeaderProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

export default function LandingHeader({ onSignIn, onSignUp }: LandingHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const { scrollY } = useScroll();

  // Once the user scrolls past the hero, narrow the pill and intensify blur.
  useMotionValueEvent(scrollY, "change", (y) => {
    setScrolled(y > 80);
  });

  const NavItem = ({
    icon: Icon,
    label,
    onClick,
  }: {
    icon: typeof Home;
    label: string;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-white/85 hover:text-white hover:bg-white/10 transition-colors"
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  );

  return (
    <header className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <motion.div
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-auto"
      >
        <motion.div
          animate={{
            scale: scrolled ? 0.96 : 1,
            backgroundColor: scrolled
              ? "rgba(0,0,0,0.92)"
              : "rgba(0,0,0,0.85)",
          }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-1 pl-2 pr-2 py-1.5 rounded-full backdrop-blur-xl border border-white/10 shadow-lg"
        >
          <button
            onClick={() => navigate("/")}
            className="flex items-center justify-center h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            aria-label="Home"
          >
            <img src={syncareerLogo} alt="Syncareer" className="h-5 w-5 object-contain" />
          </button>
          <nav className="hidden sm:flex items-center">
            <NavItem icon={Home} label="Home" onClick={() => navigate("/")} />
            <NavItem icon={Sparkles} label="Assessment" onClick={() => navigate("/assessment")} />
            <NavItem icon={Tag} label="Pricing" onClick={() => navigate("/pricing")} />
            <NavItem icon={LogIn} label="Sign in" onClick={onSignIn} />
          </nav>
          <button
            className="sm:hidden flex items-center justify-center h-8 w-8 rounded-full text-white/85 hover:bg-white/10"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        </motion.div>
      </motion.div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-72">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 mt-6">
            <button onClick={() => { navigate("/"); setMobileOpen(false); }} className="text-left py-3 text-sm">Home</button>
            <button onClick={() => { navigate("/assessment"); setMobileOpen(false); }} className="text-left py-3 text-sm">Free Assessment</button>
            <button onClick={() => { navigate("/pricing"); setMobileOpen(false); }} className="text-left py-3 text-sm">Pricing</button>
            <hr className="my-3 border-border" />
            <Button variant="ghost" onClick={() => { onSignIn(); setMobileOpen(false); }}>Sign in</Button>
            <Button onClick={() => { onSignUp(); setMobileOpen(false); }} className="rounded-full">Create account</Button>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
