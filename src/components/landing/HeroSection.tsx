import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface HeroSectionProps {
  onSignUp: () => void;
  onWatchVideo?: () => void;
}

export default function HeroSection({ onSignUp }: HeroSectionProps) {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20">
      <div className="container mx-auto px-6 relative z-10 text-center max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.08] tracking-tight mb-6">
            Discover Your Career Path,{" "}
            <span className="relative inline-block">
              <span className="text-primary">Build Your CV</span>
              <motion.span
                className="absolute -inset-x-4 -inset-y-2 bg-primary/10 rounded-lg -z-10"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
                style={{ transformOrigin: "left" }}
              />
            </span>
            , Ace the Interview
          </h1>
          <p className="text-base sm:text-lg text-white/70 leading-relaxed mb-6 max-w-2xl mx-auto">
            Take a free 5-minute career assessment and get matched to real career paths — no sign-up needed.
          </p>

          {/* Stats bar */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-10 text-sm text-white/50">
            <span>2,400+ assessments taken</span>
            <span className="hidden sm:inline">·</span>
            <span>12+ universities</span>
            <span className="hidden sm:inline">·</span>
            <span>100% free to start</span>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-4">
            <Button
              size="lg"
              onClick={() => navigate('/assessment')}
              className="rounded-full px-10 h-14 text-base font-semibold gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Take Free Assessment
              <ArrowRight className="h-4 w-4" />
            </Button>
            <button
              onClick={onSignUp}
              className="text-sm text-white/60 hover:text-white underline underline-offset-4 transition-colors"
            >
              or create an account
            </button>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
      >
        <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
        </div>
      </motion.div>
    </section>
  );
}
