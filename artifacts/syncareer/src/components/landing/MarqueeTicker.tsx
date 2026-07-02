const ITEMS = [
  "Career clarity",
  "RIASEC diagnostic",
  "ATS-ready CV",
  "Voice interview practice",
  "Vetted counsellors",
  "Real openings",
  "Skill gap analysis",
  "Explainable scoring",
  "Free forever tier",
  "Built for African graduates",
];

export default function MarqueeTicker() {
  const loop = [...ITEMS, ...ITEMS];
  return (
    <div className="relative border-y border-white/10 bg-[#0a1512] py-5 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10"
        style={{ background: "linear-gradient(to right, #0a1512, transparent)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10"
        style={{ background: "linear-gradient(to left, #0a1512, transparent)" }}
      />
      <div className="flex whitespace-nowrap animate-[ticker_40s_linear_infinite]">
        {loop.map((t, i) => (
          <div key={i} className="flex items-center shrink-0 px-6">
            <span className="text-[15px] font-medium text-white/60 tracking-tight">
              {t}
            </span>
            <span
              aria-hidden
              className="ml-12 h-1.5 w-1.5 rounded-full bg-[#00c4cc]/60"
            />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
