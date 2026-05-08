import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import landingHero from "@/assets/landing-hero.jpg";

interface HeroSectionProps {
  onSignUp: () => void;
}

export default function HeroSection({ onSignUp }: HeroSectionProps) {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden">
      {/* Photographic backdrop — hero only */}
      <div className="absolute inset-0 -z-10">
        <img
          src={landingHero}
          alt=""
          width={1920}
          height={1080}
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60" />
      </div>

      <div className="relative z-10 container mx-auto px-6 text-center max-w-5xl pt-24 pb-16">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="font-serif text-white text-5xl sm:text-6xl md:text-7xl lg:text-[7.5rem] leading-[1.02] tracking-tight"
        >
          From Uncertainty
          <br />
          <span className="italic">to Career Clarity</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
          className="mt-8 text-base sm:text-lg text-white/80 max-w-xl mx-auto"
        >
          A free 5-minute assessment, an ATS-ready CV, and AI interview practice — all in one place.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.45 }}
          className="mt-10 flex flex-wrap justify-center items-center gap-3"
        >
          <button
            onClick={() => navigate('/assessment')}
            className="rounded-full px-7 h-12 text-sm font-medium bg-landing-ink text-white hover:bg-black transition-colors shadow-lg"
          >
            Start your journey
          </button>
          <button
            onClick={onSignUp}
            className="rounded-full px-7 h-12 text-sm font-medium bg-white text-landing-ink hover:bg-white/90 transition-colors shadow-lg"
          >
            Create account
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.7 }}
          className="mt-10 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-white/55 uppercase tracking-[0.2em]"
        >
          <span>2,400+ assessments</span>
          <span className="hidden sm:inline">·</span>
          <span>12+ universities</span>
          <span className="hidden sm:inline">·</span>
          <span>100% free to start</span>
        </motion.div>
      </div>
    </section>
  );
}
