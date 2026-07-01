import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import AnimatedSection from "./AnimatedSection";

export default function FinalCTASection() {
  const navigate = useNavigate();
  return (
    <section className="relative py-24 lg:py-32 bg-[#0a1512] text-white overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00c4cc]/40 to-transparent"
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[900px] rounded-full blur-[140px] opacity-25"
        style={{ background: "radial-gradient(circle, #00c4cc 0%, transparent 70%)" }}
      />
      <AnimatedSection>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]">
            Start your career journey today.
          </h2>
          <p className="mt-6 text-lg text-white/70 max-w-xl mx-auto leading-relaxed">
            Join thousands of students using Syncareer to discover, prepare for,
            and land their first role.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => navigate("/assessment")}
              className="group inline-flex items-center gap-2 rounded-full bg-[#00c4cc] px-6 h-12 text-sm font-semibold text-[#0a1512] hover:bg-[#33d4da] transition-colors shadow-[0_10px_40px_-10px_rgba(0,196,204,0.6)]"
            >
              Start free assessment
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              onClick={() => navigate("/sign-up")}
              className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.03] px-6 h-12 text-sm font-medium text-white hover:bg-white/[0.07] transition-colors"
            >
              Create account
            </button>
          </div>
        </div>
      </AnimatedSection>
    </section>
  );
}
