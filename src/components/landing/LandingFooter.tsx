import { useNavigate } from "react-router-dom";

export default function LandingFooter() {
  const navigate = useNavigate();

  return (
    <footer className="bg-landing-ink text-white/80">
      <div className="container mx-auto px-6 py-16 md:py-20 max-w-6xl">
        <div className="grid md:grid-cols-2 gap-10 md:gap-16">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50 mb-4">Have a question? Email us at</p>
            <a href="mailto:hello@syncareer.me" className="font-serif text-3xl md:text-4xl text-white hover:text-landing-amber transition-colors">
              hello@syncareer.me
            </a>
          </div>
          <nav className="flex flex-wrap items-start md:justify-end gap-x-10 gap-y-3 font-serif text-2xl md:text-3xl">
            <button onClick={() => navigate('/')} className="text-white hover:text-landing-amber transition-colors">Home</button>
            <button onClick={() => navigate('/assessment')} className="text-white hover:text-landing-amber transition-colors">Assessment</button>
            <button onClick={() => navigate('/pricing')} className="text-white hover:text-landing-amber transition-colors">Pricing</button>
            <button onClick={() => navigate('/terms')} className="text-white hover:text-landing-amber transition-colors">Terms</button>
          </nav>
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <p>© {new Date().getFullYear()} Syncareer. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="https://www.tiktok.com/@syncareer" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">TikTok</a>
            <a href="https://www.instagram.com/syncareer" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Instagram</a>
            <a href="/terms" className="hover:text-white transition-colors">Privacy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
