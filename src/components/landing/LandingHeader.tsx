import { Button } from "@/components/ui/button";
import { WhatsAppShareButton } from "@/components/shared/WhatsAppShareButton";
import syncareerLogo from "@/assets/syncareer-logo.png";

interface LandingHeaderProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

export default function LandingHeader({ onSignIn, onSignUp }: LandingHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src={syncareerLogo} alt="Syncareer" className="h-8 w-auto object-contain" />
          <span className="hidden sm:inline text-xl font-bold text-foreground tracking-tight">Syncareer</span>
        </div>
        <nav className="hidden md:flex items-center gap-8">
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
          <Button variant="ghost" size="sm" onClick={onSignIn} className="text-muted-foreground hover:text-foreground">
            Log in
          </Button>
          <Button size="sm" onClick={onSignUp} className="rounded-full px-5">
            Get Started
          </Button>
        </div>
      </div>
    </header>
  );
}
