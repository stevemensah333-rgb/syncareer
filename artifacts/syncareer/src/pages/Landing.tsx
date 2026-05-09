import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { getHomeRouteForRole } from "@/components/auth/RoleRoute";
import { setMetaTags, setOrganizationSchema, setApplicationSchema } from "@/lib/seo";
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
    // Set SEO metadata
    setMetaTags({
      title: 'Syncareer - AI-Powered Career Platform for African Graduates',
      description: 'Get an ATS-ready CV, practice interviews with AI, and find jobs tailored to your skills. All for free.',
      keywords: 'career, assessment, CV builder, interview practice, jobs, African graduates',
      ogTitle: 'Syncareer - Your Career Companion',
      ogDescription: 'AI-powered career platform for African graduates. Assessment, CV builder, interview practice, and job matching.',
      ogImage: 'https://syncareer.com/og-image.png',
      ogUrl: 'https://syncareer.com',
      canonical: 'https://syncareer.com',
      twitterCard: 'summary_large_image',
    });

    // Set structured data
    setOrganizationSchema({
      name: 'Syncareer',
      logo: 'https://syncareer.com/logo.png',
      url: 'https://syncareer.com',
      sameAs: [
        'https://twitter.com/syncareer',
        'https://linkedin.com/company/syncareer',
      ],
    });

    setApplicationSchema({
      name: 'Syncareer',
      description: 'AI-powered career development platform for African graduates',
      url: 'https://syncareer.com',
      image: 'https://syncareer.com/app-preview.png',
      applicationCategory: 'EducationalApplication',
    });
  }, []);

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
