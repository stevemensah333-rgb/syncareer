import landingBg from "@/assets/landing-bg.png";

export default function LandingBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <img
        src={landingBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Stronger overlay to hide baked-in text */}
      <div className="absolute inset-0 bg-black/70" />
      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/40" />
    </div>
  );
}
