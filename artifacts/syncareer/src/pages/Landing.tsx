import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { getHomeRouteForRole } from "@/components/auth/RoleRoute";
import {
  generateStructuredData,
  setApplicationSchema,
  setMetaTags,
  setOrganizationSchema,
} from "@/lib/seo";
import LandingHeader from "@/components/landing/LandingHeader";
import HeroSection from "@/components/landing/HeroSection";
import ProductStory from "@/components/landing/ProductStory";
import FAQSection, { LANDING_FAQS } from "@/components/landing/FAQSection";
import FinalCTASection from "@/components/landing/FinalCTASection";
import LandingFooter from "@/components/landing/LandingFooter";

const SITE_URL = "https://syncareer.me";
const SEO_DESCRIPTION =
  "Syncareer helps African graduates turn real opportunities into stronger, evidence-based applications with role-specific CV guidance, interview practice, and application tracking.";

export default function Landing() {
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || profileLoading) return;
    if (!profile || !profile.onboarding_completed) {
      navigate("/onboarding", { replace: true });
      return;
    }
    navigate(getHomeRouteForRole(profile.user_type || null), { replace: true });
  }, [isSignedIn, isLoaded, profile, profileLoading, navigate]);

  useEffect(() => {
    setMetaTags({
      title: "Syncareer — Stronger, Evidence-Based Graduate Applications",
      description: SEO_DESCRIPTION,
      canonical: SITE_URL,
      ogTitle: "Syncareer — From Opportunity to Stronger Application",
      ogDescription: SEO_DESCRIPTION,
      ogUrl: SITE_URL,
      twitterCard: "summary_large_image",
    });

    setOrganizationSchema({
      name: "Syncareer",
      url: SITE_URL,
      logo: `${SITE_URL}/favicon.png`,
    });

    setApplicationSchema({
      name: "Syncareer",
      description: SEO_DESCRIPTION,
      url: SITE_URL,
      image: `${SITE_URL}/favicon.png`,
      applicationCategory: "BusinessApplication",
    });

    generateStructuredData("FAQPage", {
      mainEntity: LANDING_FAQS.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.a,
        },
      })),
    });
  }, []);

  if (!isLoaded || isSignedIn) {
    return (
      <div className="grid min-h-screen place-items-center bg-background" role="status" aria-live="polite">
        <span className="text-sm text-muted-foreground">Loading Syncareer…</span>
      </div>
    );
  }

  const goToSignIn = () => navigate("/sign-in");
  const startAssessment = () => navigate("/assessment");

  return (
    <div className="app-canvas min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <LandingHeader
        onSignIn={goToSignIn}
        onSignUp={startAssessment}
        primaryActionLabel="Start assessment"
      />
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        <HeroSection onGetStarted={startAssessment} />
        <ProductStory />
        <FAQSection />
        <FinalCTASection onGetStarted={startAssessment} />
      </main>
      <LandingFooter />
    </div>
  );
}
