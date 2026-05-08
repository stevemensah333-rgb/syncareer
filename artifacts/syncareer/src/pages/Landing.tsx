import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/react";
import { supabase } from "@/integrations/supabase/client";
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
  const { isSignedIn, isLoaded, userId } = useAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) return;
    const checkProfile = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type, onboarding_completed')
        .eq('id', userId)
        .maybeSingle();
      if (profile) {
        if (!profile.onboarding_completed) {
          navigate('/onboarding');
        } else {
          navigate(getHomeRouteForRole(profile.user_type || null));
        }
      }
    };
    checkProfile();
  }, [isLoaded, isSignedIn, userId, navigate]);

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
