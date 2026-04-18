import { useState } from "react";
import { Button } from "@/components/ui/button";
import { WhatsAppShareButton } from "@/components/shared/WhatsAppShareButton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import syncareerLogo from "@/assets/syncareer-logo.svg";

interface LandingHeaderProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

export default function LandingHeader({ onSignIn, onSignUp }: LandingHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src={syncareerLogo} alt="Syncareer" className="h-14 w-auto object-contain" />
          <span className="hidden sm:inline text-xl font-bold text-foreground tracking-tight">Syncareer</span>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            How It Works
          </a>
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#demo" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Demo
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <WhatsAppShareButton
            text="Check out Syncareer — a free AI career tool for students. Take the career assessment:"
            variant="icon"
          />
          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onSignIn} className="text-muted-foreground hover:text-foreground">
              Log in
            </Button>
            <Button size="sm" onClick={onSignUp} className="rounded-full px-5">
              Get Started
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-foreground"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-72">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-4 mt-6">
            <a href="#how-it-works" onClick={() => setMobileOpen(false)} className="text-sm text-foreground py-2">
              How It Works
            </a>
            <a href="#features" onClick={() => setMobileOpen(false)} className="text-sm text-foreground py-2">
              Features
            </a>
            <a href="#demo" onClick={() => setMobileOpen(false)} className="text-sm text-foreground py-2">
              Demo
            </a>
            <hr className="border-border" />
            <Button variant="ghost" onClick={() => { onSignIn(); setMobileOpen(false); }}>
              Log in
            </Button>
            <Button onClick={() => { onSignUp(); setMobileOpen(false); }} className="rounded-full">
              Get Started
            </Button>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
