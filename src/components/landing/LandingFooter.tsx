import { useNavigate } from "react-router-dom";
import syncareerLogo from "@/assets/syncareer-logo.svg";

export default function LandingFooter() {
  const navigate = useNavigate();

  return (
    <footer className="bg-background border-t border-border">
      <div className="container mx-auto px-6 py-14 max-w-6xl">
        <div className="grid md:grid-cols-[2fr_1fr_1fr_1fr] gap-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src={syncareerLogo} alt="Syncareer" className="h-6 w-6" />
              <span className="text-base font-semibold text-foreground">Syncareer</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              AI-powered career intelligence for students and recent graduates.
            </p>
            <a href="mailto:hello@syncareer.me" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
              hello@syncareer.me
            </a>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">Product</p>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => navigate('/assessment')} className="text-muted-foreground hover:text-foreground transition-colors">Assessment</button></li>
              <li><button onClick={() => navigate('/pricing')} className="text-muted-foreground hover:text-foreground transition-colors">Pricing</button></li>
              <li><button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground transition-colors">Features</button></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">Company</p>
            <ul className="space-y-2 text-sm">
              <li><a href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Terms</a></li>
              <li><a href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Privacy</a></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">Social</p>
            <ul className="space-y-2 text-sm">
              <li><a href="https://www.tiktok.com/@syncareer" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">TikTok</a></li>
              <li><a href="https://www.instagram.com/syncareer" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">Instagram</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Syncareer. All rights reserved.</p>
          <p>Made for African graduates.</p>
        </div>
      </div>
    </footer>
  );
}
