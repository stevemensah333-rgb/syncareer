import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface HeroSectionProps {
  onSignUp: () => void;
}

const HEADLINE_LINES: string[][] = [
  ["From", "uncertainty"],
  ["to", "career", "clarity."],
];

const EASE = [0.22, 1, 0.36, 1] as const;

export default function HeroSection({ onSignUp }: HeroSectionProps) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  // Slow parallax on the hero photo as the user scrolls down.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const photoY = useTransform(scrollYProgress, [0, 1], ["0%", "-12%"]);
  const photoScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.12]);

  // Per-word stagger animation for the headline.
  let wordIndex = 0;

  return (
    <section
      ref={sectionRef}
      className="relative isolate min-h-[100svh] flex items-center justify-center overflow-hidden"
    >
      {/* Full-bleed hero photo with slow parallax */}
      <motion.div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={reduce ? undefined : { y: photoY, scale: photoScale }}
      >
        <img
          src="/landing/hero-graduate.png"
          alt=""
          loading="eager"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        {/* Cream wash so the editorial type stays legible */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, hsl(var(--landing-cream) / 0.55) 0%, hsl(var(--landing-cream) / 0.35) 40%, hsl(var(--landing-cream) / 0.85) 100%)",
          }}
        />
      </motion.div>

      <div className="relative z-10 container mx-auto px-6 text-center max-w-5xl pt-32 pb-24">
        {/* Floating eyebrow badge */}
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="inline-flex"
        >
          <motion.div
            animate={
              reduce
                ? undefined
                : { y: [0, -6, 0] }
            }
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur px-3.5 py-1.5 text-[11px] font-medium text-foreground/70 shadow-sm ring-1 ring-black/[0.04] mb-10"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            For African graduates · Built with care
          </motion.div>
        </motion.div>

        {/* Editorial serif headline, per-word stagger */}
        <h1 className="font-serif text-foreground text-5xl sm:text-6xl md:text-7xl lg:text-[8rem] font-normal leading-[0.98] tracking-[-0.02em]">
          {HEADLINE_LINES.map((line, lineIdx) => (
            <span
              key={lineIdx}
              className="block"
              style={{
                fontStyle: lineIdx === 1 ? "italic" : "normal",
              }}
            >
              {line.map((word) => {
                const i = wordIndex++;
                return (
                  <motion.span
                    key={`${lineIdx}-${i}`}
                    initial={{ opacity: 0, y: reduce ? 0 : "0.4em" }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.8,
                      delay: 0.15 + i * 0.08,
                      ease: EASE,
                    }}
                    className="inline-block mr-[0.22em] last:mr-0"
                  >
                    {word === "clarity." ? (
                      <span className="text-primary">{word}</span>
                    ) : (
                      word
                    )}
                  </motion.span>
                );
              })}
            </span>
          ))}
        </h1>

        {/* Sub-copy */}
        <motion.p
          initial={{ opacity: 0, y: reduce ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7, ease: EASE }}
          className="mx-auto mt-8 max-w-xl text-base sm:text-lg text-foreground/70 leading-relaxed"
        >
          A free 5-minute career assessment, an ATS-ready CV builder, and AI
          interview practice — built to get you hired.
        </motion.p>

        {/* Pill CTAs */}
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.85, ease: EASE }}
          className="mt-10 flex flex-wrap justify-center items-center gap-3"
        >
          <button
            onClick={() => navigate("/assessment")}
            className="group inline-flex items-center gap-2 rounded-full px-6 h-12 text-sm font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors shadow-sm"
          >
            Start free assessment
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <button
            onClick={onSignUp}
            className="inline-flex items-center rounded-full px-6 h-12 text-sm font-medium bg-white/85 backdrop-blur text-foreground hover:bg-white transition-colors ring-1 ring-black/[0.06]"
          >
            Create account
          </button>
        </motion.div>
      </div>
    </section>
  );
}
