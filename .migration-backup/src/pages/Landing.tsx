import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getHomeRouteForRole } from "@/components/auth/RoleRoute";
import AuthDialog from "@/components/auth/AuthDialog";
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
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const hash = window.location.hash;
      if (hash.includes('type=recovery')) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type, onboarding_completed')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile) {
          if (!profile.onboarding_completed) {
            navigate('/onboarding');
          } else {
            navigate(getHomeRouteForRole(profile.user_type || null));
          }
        }
      }
    };
    checkAuth();
  }, [navigate]);

  const openSignIn = () => { setAuthMode('signin'); setAuthOpen(true); };
  const openSignUp = () => { setAuthMode('signup'); setAuthOpen(true); };

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

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} defaultMode={authMode} />
    </div>
  );
}
