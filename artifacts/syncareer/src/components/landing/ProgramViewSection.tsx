import AnimatedSection from "./AnimatedSection";

export default function ProgramViewSection() {
  return (
    <section className="relative py-24 lg:py-32 bg-[#f7f5ef] text-[#0a1512] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-[1fr_1.2fr] gap-14 items-center">
        <AnimatedSection>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#009ba1]">
            Real tools
          </p>
          <h2 className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]">
            Calm tools, real outcomes.
          </h2>
          <p className="mt-6 text-lg text-[#0a1512]/70 leading-relaxed max-w-md">
            From assessment to first offer, the journey is organised around
            proof: a shortlist you can act on, a CV recruiters can scan, and
            interview reps you can measure.
          </p>

          <ul className="mt-8 space-y-4">
            {[
              {
                t: "Career Discovery",
                b: "A clear roadmap that turns your strengths into a shortlist of careers you can actually pursue from where you are today.",
              },
              {
                t: "CV That Gets Callbacks",
                b: "Quantified achievements, ATS-friendly formatting, instant strength scoring — written the way recruiters actually scan.",
              },
              {
                t: "Interviews on Demand",
                b: "Practice voice interviews any time, in private, and walk in confident on the day. No theatrics, just calm rehearsal.",
              },
            ].map((f) => (
              <li key={f.t} className="border-l-2 border-[#00c4cc] pl-4">
                <p className="text-base font-semibold">{f.t}</p>
                <p className="mt-1 text-sm text-[#0a1512]/70 leading-relaxed">
                  {f.b}
                </p>
              </li>
            ))}
          </ul>
        </AnimatedSection>

        {/* Dashboard mockup */}
        <AnimatedSection delay={0.15}>
          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-6 rounded-[32px] bg-gradient-to-br from-[#00c4cc]/20 to-transparent blur-2xl"
            />
            <div className="relative rounded-2xl border border-black/8 bg-white shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] overflow-hidden">
              {/* Window chrome */}
              <div className="flex items-center gap-1.5 px-4 h-9 border-b border-black/5 bg-[#f7f5ef]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-3 text-[11px] text-[#0a1512]/50 font-mono">
                  syncareer.app / dashboard
                </span>
              </div>

              <div className="p-5 sm:p-7">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-[#0a1512]/50">
                      Career readiness
                    </p>
                    <p className="mt-1 text-3xl font-semibold tracking-tight">
                      72<span className="text-lg text-[#0a1512]/40">/100</span>
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00c4cc]/10 px-3 py-1 text-[11px] font-medium text-[#009ba1]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00c4cc]" />
                    On track
                  </span>
                </div>

                {/* Progress bars */}
                <div className="mt-6 space-y-4">
                  {[
                    { label: "Assessment complete", pct: 100, tag: "Done" },
                    { label: "CV strength", pct: 82, tag: "Strong" },
                    { label: "Interview reps", pct: 55, tag: "In progress" },
                    { label: "Applications tracked", pct: 40, tag: "6 open" },
                  ].map((r) => (
                    <div key={r.label}>
                      <div className="flex justify-between text-[13px]">
                        <span className="text-[#0a1512]/80">{r.label}</span>
                        <span className="text-[#0a1512]/50">{r.tag}</span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-black/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#00c4cc]"
                          style={{ width: `${r.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cards */}
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-black/5 bg-[#f7f5ef]/60 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-[#0a1512]/50">
                      Top career fit
                    </p>
                    <p className="mt-1 text-sm font-semibold">UX Designer</p>
                    <p className="text-[11px] text-[#0a1512]/60">
                      92% match · KNUST alumni path
                    </p>
                  </div>
                  <div className="rounded-xl border border-black/5 bg-[#f7f5ef]/60 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-[#0a1512]/50">
                      Next up
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      Interview: PM screen
                    </p>
                    <p className="text-[11px] text-[#0a1512]/60">
                      SynAssist · 15 min
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
