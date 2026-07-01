import { motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";

interface HeroSectionProps {
  onSignUp: () => void;
}

const EASE = [0.22, 1, 0.36, 1] as const;

const BENEFITS = [
  "Research-backed RIASEC diagnostic",
  "ATS-friendly CV with strength score",
  "Voice interview practice with SynAssist",
  "Vetted career counsellors",
  "Real openings from Ghana and beyond",
  "Explainable, actionable scoring",
  "Free to start — no card required",
];

export default function HeroSection({ onSignUp }: HeroSectionProps) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  return (
    <section id="why" className="relative overflow-hidden">
      {/* Grid pattern background */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,196,204,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,196,204,0.5) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 40%, black 40%, transparent 100%)",
        }}
      />
      {/* Teal glow */}
      <div
        aria-hidden
        className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full blur-[140px] opacity-30"
        style={{ background: "radial-gradient(circle, #00c4cc 0%, transparent 70%)" }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-24 lg:pt-24 lg:pb-32 grid lg:grid-cols-[1.15fr_1fr] gap-12 lg:gap-16 items-start">
        {/* Left: eyebrow + headline + CTA */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="inline-flex items-center gap-2 rounded-full border border-[#00c4cc]/30 bg-[#00c4cc]/5 px-3 py-1.5 text-[13px] text-[#00c4cc] font-medium"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#00c4cc]" />
            For African graduates · Built with care
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: reduce ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
            className="mt-6 text-white font-semibold tracking-tight text-[44px] sm:text-[56px] lg:text-[76px] leading-[1.02]"
          >
            From uncertainty to <span className="text-[#00c4cc]">career clarity.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: reduce ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
            className="mt-6 text-lg text-white/70 max-w-xl leading-relaxed"
          >
            A free 5-minute career assessment, an ATS-ready CV builder, and AI
            interview practice — built to get you hired.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: EASE }}
            className="mt-9 flex flex-wrap gap-3"
          >
            <button
              onClick={() => navigate("/assessment")}
              className="group inline-flex items-center gap-2 rounded-full bg-[#00c4cc] px-6 h-12 text-sm font-semibold text-[#0a1512] hover:bg-[#33d4da] transition-colors shadow-[0_10px_40px_-10px_rgba(0,196,204,0.6)]"
            >
              Start free assessment
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              onClick={onSignUp}
              className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.03] px-6 h-12 text-sm font-medium text-white hover:bg-white/[0.07] transition-colors"
            >
              Create account
            </button>
          </motion.div>

          <p className="mt-4 text-xs text-white/50">
            Free forever tier. No credit card. 5 minutes to your first result.
          </p>
        </div>

        {/* Right: "What every student gets" card */}
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: EASE }}
          className="relative rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur p-6 sm:p-7 shadow-[0_30px_80px_-30px_rgba(0,196,204,0.35)]"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00c4cc]">
            What you get
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            Everything you need to land your first role.
          </h3>

          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              { label: "Format", value: "Free" },
              { label: "Assessment", value: "5 min" },
              { label: "Careers", value: "25+" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
              >
                <p className="text-[10px] uppercase tracking-wider text-white/50">
                  {s.label}
                </p>
                <p className="mt-1 text-white font-semibold text-lg">{s.value}</p>
              </div>
            ))}
          </div>

          <ul className="mt-6 space-y-3">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-3">
                <span className="mt-0.5 h-5 w-5 rounded-full bg-[#00c4cc]/15 grid place-items-center shrink-0">
                  <Check className="h-3 w-3 text-[#00c4cc]" strokeWidth={3} />
                </span>
                <span className="text-sm text-white/85">{b}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
