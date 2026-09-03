import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LegalPageLayout, LegalSection, type LegalSectionDefinition } from '@/components/legal/LegalPageLayout';
import { setMetaTags } from '@/lib/seo';

export const TERMS_SECTIONS = [
  { id: 'introduction', title: 'Introduction' },
  { id: 'description-of-service', title: 'Description of Service' },
  { id: 'user-accounts', title: 'User Accounts' },
  { id: 'user-data-and-content', title: 'User Data & Content' },
  { id: 'ai-generated-recommendations', title: 'AI-Generated Recommendations' },
  { id: 'payments-and-subscriptions', title: 'Payments & Subscriptions' },
  { id: 'prohibited-conduct', title: 'Prohibited Conduct' },
  { id: 'intellectual-property', title: 'Intellectual Property' },
  { id: 'data-privacy', title: 'Data Privacy' },
  { id: 'limitation-of-liability', title: 'Limitation of Liability' },
  { id: 'modifications-to-the-service', title: 'Modifications to the Service' },
  { id: 'termination', title: 'Termination' },
  { id: 'governing-law', title: 'Governing Law' },
  { id: 'contact-information', title: 'Contact Information' },
] as const satisfies readonly LegalSectionDefinition[];

export default function TermsAndConditions() {
  useEffect(() => { setMetaTags({ title: 'Terms and Conditions — Syncareer', description: 'The rules governing your access to and use of Syncareer.', ogTitle: 'Syncareer Terms and Conditions', ogDescription: 'The rules governing your access to and use of Syncareer.', ogUrl: 'https://syncareer.me/terms', ogImage: 'https://syncareer.me/og-image.png', ogImageWidth: 1200, ogImageHeight: 630, ogImageAlt: 'Syncareer — Turn a real opportunity into a stronger application.', canonical: 'https://syncareer.me/terms', twitterCard: 'summary_large_image', twitterTitle: 'Syncareer Terms and Conditions', twitterDescription: 'The rules governing your access to and use of Syncareer.', twitterImage: 'https://syncareer.me/og-image.png' }); }, []);
  return <LegalPageLayout document="terms" eyebrow="LEGAL" title="Terms and Conditions" description="The rules governing your access to and use of Syncareer." effectiveDate="1 February 2026" sections={TERMS_SECTIONS}>
    <LegalSection number={1} {...TERMS_SECTIONS[0]}><p>Welcome to Syncareer. These Terms and Conditions govern your use of the Syncareer platform, website, and services (the "Service"). By accessing or using Syncareer, you agree to be bound by these Terms. If you do not agree, you may not use the Service.</p></LegalSection>
    <LegalSection number={2} {...TERMS_SECTIONS[1]}><p>Syncareer is a career intelligence platform that:</p><ul><li>Analyzes user skills and experience</li><li>Matches users with potential career paths</li><li>Provides AI-generated career recommendations</li><li>May offer premium features or paid services</li></ul><p>Syncareer does not guarantee employment, job placement, or admission into any institution.</p></LegalSection>
    <LegalSection number={3} {...TERMS_SECTIONS[2]}><p>To access certain features, you must create an account. You agree to:</p><ul><li>Provide accurate and complete information</li><li>Keep your login credentials secure</li><li>Notify us of unauthorized use</li><li>Accept responsibility for activity under your account</li></ul><p>We reserve the right to suspend or terminate accounts that violate these Terms.</p></LegalSection>
    <LegalSection number={4} {...TERMS_SECTIONS[3]}><p>You may provide: skills, work experience, educational background, and career preferences. By submitting content, you grant Syncareer a non-exclusive license to process and analyze this information for the purpose of providing career recommendations. You retain ownership of your personal information.</p></LegalSection>
    <LegalSection number={5} {...TERMS_SECTIONS[4]}><p>Syncareer uses artificial intelligence to generate career insights and recommendations. You acknowledge that:</p><ul><li>AI-generated content may not always be accurate or complete</li><li>Recommendations are informational only</li><li>Final career decisions are your responsibility</li></ul><p>Syncareer is not liable for decisions made based on AI outputs.</p></LegalSection>
    <LegalSection number={6} {...TERMS_SECTIONS[5]}><p>If Syncareer offers paid features: payments are processed via third-party providers (e.g., Stripe, Mobile Money, etc.). Fees are displayed before purchase. Refund policies (if any) will be clearly stated. Failure to pay may result in suspension of premium features.</p></LegalSection>
    <LegalSection number={7} {...TERMS_SECTIONS[6]}><p>You agree not to:</p><ul><li>Use the platform for unlawful purposes</li><li>Attempt to hack, disrupt, or reverse engineer the system</li><li>Scrape or extract data</li><li>Impersonate another person</li><li>Upload malicious code</li></ul><p>Violations may result in account termination.</p></LegalSection>
    <LegalSection number={8} {...TERMS_SECTIONS[7]}><p>All content, branding, logos, software, and design elements of Syncareer are the property of Syncareer unless otherwise stated. You may not copy, reproduce, or distribute content without permission.</p></LegalSection>
    <LegalSection number={9} {...TERMS_SECTIONS[8]}><p>Your use of Syncareer is also governed by our <Link to="/privacy">Privacy Policy</Link>. We implement reasonable security measures to protect user data. However, no system is completely secure.</p></LegalSection>
    <LegalSection number={10} {...TERMS_SECTIONS[9]}><p>To the maximum extent permitted by law, Syncareer shall not be liable for:</p><ul><li>Indirect or consequential damages</li><li>Loss of employment opportunities</li><li>Decisions made based on recommendations</li><li>Service interruptions</li></ul><p>Use of the platform is at your own risk.</p></LegalSection>
    <LegalSection number={11} {...TERMS_SECTIONS[10]}><p>We reserve the right to modify or discontinue features, update these Terms, and change pricing. Users will be notified of material changes. Continued use after updates constitutes acceptance.</p></LegalSection>
    <LegalSection number={12} {...TERMS_SECTIONS[11]}><p>We may suspend or terminate your access if you violate these Terms. You may delete your account at any time.</p></LegalSection>
    <LegalSection number={13} {...TERMS_SECTIONS[12]}><p>These Terms shall be governed by the laws of the Republic of Ghana. Any disputes shall be resolved under applicable local laws.</p></LegalSection>
    <LegalSection number={14} {...TERMS_SECTIONS[13]}><p>If you have questions about these Terms, contact:</p><ul><li>Email: <a href="mailto:syncareer01@gmail.com">syncareer01@gmail.com</a></li><li>Website: <a href="https://syncareer.me">https://syncareer.me</a></li></ul></LegalSection>
  </LegalPageLayout>;
}
