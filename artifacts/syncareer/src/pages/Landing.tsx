import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { getHomeRouteForRole } from "@/components/auth/RoleRoute";
import LandingBackground from "@/components/landing/LandingBackground";
import LandingHeader from "@/components/landing/LandingHeader";
import HeroSection from "@/components/landing/HeroSection";
import IntroStatsSection from "@/components/landing/IntroStatsSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import SolutionSection from "@/components/landing/SolutionSection";
import FeatureSpotlightSection from "@/components/landing/FeatureSpotlightSection";
import SuccessStoriesSection from "@/components/landing/SuccessStoriesSection";
import FinalCTASection from "@/components/landing/FinalCTASection";
import LandingFooter from "@/components/landing/LandingFooter";

export default function Landing() {
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    // Wait for the cached profile fetch to settle before deciding where to send them.
    if (profileLoading) return;
    // Brand-new users have no profile row yet — send them to onboarding.
    if (!profile || !profile.onboarding_completed) {
      navigate('/onboarding');
    } else {
      navigate(getHomeRouteForRole(profile.user_type || null));
    }
  }, [isLoaded, isSignedIn, profile, profileLoading, navigate]);

  const openSignIn = () => navigate('/sign-in');
  const openSignUp = () => navigate('/sign-up');

  return (
    <div className="min-h-screen relative font-sans">
      <LandingBackground />
      <LandingHeader onSignIn={openSignIn} onSignUp={openSignUp} />
      <main>
        <HeroSection onSignUp={openSignUp} />
        <IntroStatsSection />
        <HowItWorksSection />
        <SolutionSection />
        <FeatureSpotlightSection />
        <SuccessStoriesSection />
        <FinalCTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
