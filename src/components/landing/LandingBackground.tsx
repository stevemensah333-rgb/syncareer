// Background is now per-section. This component renders the cream base
// for the page; the hero & final CTA paint their own dark photographic backdrop.
export default function LandingBackground() {
  return <div className="fixed inset-0 -z-10 bg-landing-cream" aria-hidden />;
}
