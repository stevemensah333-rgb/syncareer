import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { getHomeRouteForRole } from "@/components/auth/RoleRoute";
import { setMetaTags, setOrganizationSchema, setApplicationSchema } from "@/lib/seo";
import LandingHeader from "@/components/landing/LandingHeader";
import HeroSection from "@/components/landing/HeroSection";
import MarqueeTicker from "@/components/landing/MarqueeTicker";
import TabbedShowcase from "@/components/landing/TabbedShowcase";

import WhyDifferentSection from "@/components/landing/WhyDifferentSection";
import FAQSection from "@/components/landing/FAQSection";
import FinalCTASection from "@/components/landing/FinalCTASection";
import LandingFooter from "@/components/landing/LandingFooter";

export default function Landing() {
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();

  useEffect(() => {
    setMetaTags({
      title: 'Syncareer — Career Platform for African Graduates',
      description: 'Build an ATS-ready CV, practice interviews with AI, get a career assessment, and connect with vetted counsellors.',
      keywords: 'career development, assessment, CV builder, interview practice, career counselling, African graduates',
      ogTitle: 'Syncareer — Career Platform for African Graduates',
      ogDescription: 'AI-powered career development platform for African graduates. Assessment, CV builder, interview practice, and counselling.',
      ogUrl: 'https://syncareer.me',
      canonical: 'https://syncareer.me',
      twitterCard: 'summary_large_image',
    });
    setOrganizationSchema({
      name: 'Syncareer',
      logo: 'https://syncareer.me/logo.png',
      url: 'https://syncareer.me',
      sameAs: ['https://twitter.com/syncareer', 'https://linkedin.com/company/syncareer'],
    });
    setApplicationSchema({
      name: 'Syncareer',
      description: 'AI-powered career development and counselling platform for African graduates.',
      url: 'https://syncareer.me',
      image: 'https://syncareer.me/app-preview.png',
      applicationCategory: 'EducationalApplication',
    });
    // FAQPage structured data mirrors FAQSection questions
    const faqs = [
      { q: 'Is Syncareer really free?', a: 'Yes. The career assessment, CV builder starter, and interview practice starter are free forever. No card required.' },
      { q: 'How long does the assessment take?', a: 'About 5 minutes. It uses a RIASEC diagnostic plus a short skills pass, then maps you against 25+ career paths.' },
      { q: 'Will the CV pass ATS filters?', a: 'No builder can guarantee an ATS outcome. Syncareer uses a clear single-column template and gives deterministic completion and quality guidance so you can review the content before applying.' },
      { q: 'What is SynAssist and how does interview practice work?', a: 'SynAssist is our voice-based interview coach that runs role-specific sessions with actionable feedback.' },
      { q: 'Who are the career counsellors?', a: 'Vetted, experienced counsellors — many alumni from Ghanaian universities. You can browse profiles and book sessions.' },
      { q: 'Which students is this built for?', a: 'Senior high, university, TVET students, and recent graduates across Ghana and the broader region.' },
    ];
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'faq-jsonld';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
    document.getElementById('faq-jsonld')?.remove();
    document.head.appendChild(script);
    return () => { document.getElementById('faq-jsonld')?.remove(); };
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (profileLoading) return;
    if (!profile || !profile.onboarding_completed) {
      navigate('/onboarding');
    } else {
      navigate(getHomeRouteForRole(profile.user_type || null));
    }
  }, [isLoaded, isSignedIn, profile, profileLoading, navigate]);

  const openSignIn = () => navigate('/sign-in');
  const openSignUp = () => navigate('/sign-up');

  return (
    <div className="min-h-screen font-sans bg-[#0a1512] text-white antialiased overflow-x-hidden">
      <LandingHeader onSignIn={openSignIn} onSignUp={openSignUp} />
      <main>
        <HeroSection onSignUp={openSignUp} />
        <MarqueeTicker />
        <TabbedShowcase />
        
        <WhyDifferentSection />
        <FAQSection />
        <FinalCTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
