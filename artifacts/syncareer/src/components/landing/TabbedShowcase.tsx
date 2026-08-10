import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, PlayCircle, Compass, FileText, Mic, Users, X } from "lucide-react";
import AnimatedSection from "./AnimatedSection";

type Tab = {
  n: string;
  key: string;
  label: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  cta: { label: string; href: string };
  Icon: typeof Compass;
};

const TABS: Tab[] = [
  {
    n: "01",
    key: "intro",
    label: "Intro to Syncareer",
    eyebrow: "How it works",
    title: "The career clarity engine.",
    body: "Syncareer brings career assessment, CV building, interview practice, and human counselling into one calm workflow — built for students who want a real path, not more noise.",
    bullets: [
      "End-to-end journey — from unsure to interview-ready",
      "Works alongside real career counsellors",
      "Results you can act on the same day",
    ],
    cta: { label: "Start free assessment", href: "/assessment" },
    Icon: PlayCircle,
  },
  {
    n: "02",
    key: "assessment",
    label: "Assessment",
    eyebrow: "Career discovery",
    title: "Find a path that actually fits.",
    body: "A research-backed RIASEC and skills diagnostic maps your strengths to 25+ career paths — with a plain-language explanation for every recommendation.",
    bullets: [
      "5-minute diagnostic, no filler questions",
      "Top matches ranked with reasons, not vibes",
      "Skill gaps flagged with a concrete next step",
    ],
    cta: { label: "Take the assessment", href: "/assessment" },
    Icon: Compass,
  },
  {
    n: "03",
    key: "cv",
    label: "CV Builder",
    eyebrow: "CV that gets read",
    title: "An ATS-ready CV in minutes.",
    body: "Templates engineered for African graduate hiring filters. Quantified achievements, clean structure, no graphics-heavy layouts — plus a strength score that tells you what to tighten.",
    bullets: [
      "ATS-friendly formatting by default",
      "Built-in strength score with fix-it hints",
      "Export a clean PDF when you're ready",
    ],
    cta: { label: "Open the builder", href: "/cv-builder" },
    Icon: FileText,
  },
  {
    n: "04",
    key: "interview",
    label: "Interview Practice",
    eyebrow: "Rehearsal on demand",
    title: "Walk in already rehearsed.",
    body: "Voice interviews with SynAssist. Role-specific questions, calm pacing, and structured feedback you can measure — practise privately until it feels obvious.",
    bullets: [
      "Role-specific prompts, not generic questions",
      "Feedback grounded in what you actually said",
      "Practise as many reps as you need",
    ],
    cta: { label: "Practise now", href: "/interview-simulator" },
    Icon: Mic,
  },
  {
    n: "05",
    key: "counsellor",
    label: "Counsellors",
    eyebrow: "Human guidance",
    title: "Talk to a real career counsellor.",
    body: "Book a one-on-one session with a vetted counsellor. Real people who have walked the path — available when you need a second opinion the AI can't give.",
    bullets: [
      "Vetted counsellors with published focus areas",
      "Book directly from their profile",
      "Bring your assessment and CV to the call",
    ],
    cta: { label: "Browse counsellors", href: "/counsellors" },
    Icon: Users,
  },
];

export default function TabbedShowcase() {
  const [active, setActive] = useState(0);
  const [videoOpen, setVideoOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const tab = TABS[active]!;

  useEffect(() => {
    if (!videoOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setVideoOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [videoOpen]);

  return (
    <section id="how" className="relative py-20 lg:py-28 bg-[#f7f5ef] text-[#0a1512]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <AnimatedSection>
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#009ba1]">
              How it works
            </p>
            <h2 className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]">
              Five views of the same engine.
            </h2>
            <p className="mt-6 text-lg text-[#0a1512]/70 leading-relaxed">
              Watch the system guide you from career discovery to interview-ready
              — one calm step at a time.
            </p>
          </div>
        </AnimatedSection>

        {/* Tabs */}
        <div className="mt-12 rounded-2xl border border-black/10 bg-white p-1.5 overflow-x-auto shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex gap-1 min-w-max">
            {TABS.map((t, i) => {
              const isActive = i === active;
              return (
                <button
                  key={t.key}
                  onClick={() => setActive(i)}
                  className={`relative flex-1 min-w-[180px] rounded-xl px-4 py-3.5 text-left transition-colors ${
                    isActive
                      ? "bg-[#0a1512] text-white"
                      : "text-[#0a1512]/60 hover:text-[#0a1512] hover:bg-black/[0.03]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-mono ${
                        isActive ? "text-[#00c4cc]" : "text-[#0a1512]/40"
                      }`}
                    >
                      {t.n}
                    </span>
                    <span className="text-sm font-medium tracking-tight">
                      {t.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel */}
        <div className="mt-8 grid lg:grid-cols-2 gap-8 items-stretch">
          {/* Visual */}
          <div className="relative rounded-2xl border border-black/10 bg-white overflow-hidden min-h-[380px] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab.key}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 grid place-items-center p-8"
              >
                {tab.key === "intro" ? (
                  <div className="relative w-full aspect-video rounded-xl border border-black/10 bg-[#0a1512] overflow-hidden grid place-items-center">
                    <div
                      aria-hidden
                      className="absolute inset-0 opacity-40"
                      style={{
                        background:
                          "radial-gradient(circle at 50% 50%, rgba(0,196,204,0.35), transparent 60%)",
                      }}
                    />
                    <button
                      onClick={() => setVideoOpen(true)}
                      className="relative z-10 flex items-center gap-3 text-white group"
                      aria-label="Play Syncareer intro video"
                    >
                      <span className="grid place-items-center h-16 w-16 rounded-full bg-[#00c4cc] text-[#0a1512] shadow-[0_10px_40px_-5px_rgba(0,196,204,0.6)] group-hover:scale-105 transition-transform">
                        <PlayCircle className="h-8 w-8" strokeWidth={1.5} />
                      </span>
                      <span className="text-left">
                        <span className="block text-sm font-semibold">
                          Watch the intro
                        </span>
                        <span className="block text-xs text-white/60">
                          2 min · what Syncareer does
                        </span>
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="w-full max-w-md">
                    <div className="rounded-xl border border-black/10 bg-[#f7f5ef] p-6">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] text-[#0a1512]/70">
                          <tab.Icon className="h-3.5 w-3.5 text-[#009ba1]" />
                          {tab.label}
                        </span>
                        <span className="text-[11px] font-mono text-[#0a1512]/40">
                          {tab.n}
                        </span>
                      </div>
                      <h4 className="mt-5 text-xl font-semibold tracking-tight text-[#0a1512]">
                        {tab.title}
                      </h4>
                      <div className="mt-5 space-y-2.5">
                        {tab.bullets.map((b, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 rounded-lg bg-white border border-black/[0.06] px-3 py-2"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-[#00c4cc]" />
                            <span className="text-[13px] text-[#0a1512]/80">{b}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Copy */}
          <div className="rounded-2xl border border-black/10 bg-white p-8 lg:p-10 flex flex-col shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab.key + "-copy"}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col h-full"
              >
                <span className="inline-flex self-start items-center rounded-full border border-black/10 bg-[#f7f5ef] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0a1512]/70">
                  {tab.eyebrow}
                </span>
                <h3 className="mt-6 text-3xl sm:text-4xl font-semibold tracking-tight leading-[1.1]">
                  {tab.title}
                </h3>
                <p className="mt-5 text-[15px] text-[#0a1512]/70 leading-relaxed">
                  {tab.body}
                </p>
                <ul className="mt-6 space-y-3">
                  {tab.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#00c4cc] shrink-0" />
                      <span className="text-[14px] text-[#0a1512]/80">{b}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-8">
                  <button
                    onClick={() => navigate(tab.cta.href)}
                    className="group inline-flex items-center gap-2 rounded-full bg-[#0a1512] px-5 h-11 text-sm font-semibold text-white hover:bg-[#00c4cc] hover:text-[#0a1512] transition-colors"
                  >
                    {tab.cta.label}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Video Modal */}
      <AnimatePresence>
        {videoOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm grid place-items-center p-4"
            onClick={() => setVideoOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setVideoOpen(false)}
                className="absolute top-3 right-3 z-10 grid place-items-center h-9 w-9 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
                aria-label="Close video"
              >
                <X className="h-4 w-4" />
              </button>
              <video
                ref={videoRef}
                src="/videos/promo-video.mp4"
                controls
                autoPlay
                className="w-full h-full object-contain bg-black"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
