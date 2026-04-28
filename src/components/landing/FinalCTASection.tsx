import { useNavigate } from "react-router-dom";
import landingHero from "@/assets/landing-hero.jpg";

export default function FinalCTASection() {
  const navigate = useNavigate();

  return (
    <section className="relative py-32 md:py-44 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <img src={landingHero} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/65 to-black/85" />
      </div>

      <div className="relative z-10 container mx-auto px-6 text-center max-w-3xl">
        <h2 className="font-serif text-white text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight">
          Start your career journey
          <br />
          <span className="italic">toward lasting growth.</span>
        </h2>
        <div className="mt-12 flex justify-center">
          <button
            onClick={() => navigate('/assessment')}
            className="rounded-full px-8 h-12 text-sm font-medium bg-landing-ink text-white hover:bg-black transition-colors shadow-lg"
          >
            Take the first step now
          </button>
        </div>
      </div>
    </section>
  );
}
