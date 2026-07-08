import { useEffect } from 'react';
import { setMetaTags } from '@/lib/seo';

export default function PrivacyPolicy() {
  useEffect(() => {
    setMetaTags({
      title: 'Privacy Policy — Syncareer',
      description: 'How Syncareer collects, uses, and protects your personal information across our career platform.',
      ogTitle: 'Syncareer Privacy Policy',
      ogDescription: 'How Syncareer collects, uses, and protects your personal information.',
      ogUrl: 'https://syncareer.me/privacy',
      canonical: 'https://syncareer.me/privacy',
    });
  }, []);
  return (
    <div className="min-h-screen bg-background py-16 px-6">
      <div className="container mx-auto max-w-3xl prose prose-neutral dark:prose-invert">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-8">Effective Date: 1st February, 2026 — Platform: Syncareer</p>

        <h2>1. Introduction</h2>
        <p>Syncareer ("we", "us", "our") respects your privacy. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use the Syncareer platform, website, and services (the "Service").</p>

        <h2>2. Information We Collect</h2>
        <p>We collect information you provide directly, including:</p>
        <ul>
          <li>Account information: name, email, password, role (student, counsellor, employer)</li>
          <li>Profile information: education, skills, work history, career preferences, profile photo</li>
          <li>Generated content: CVs, assessment responses, interview recordings, portfolio uploads</li>
          <li>Payment information: processed securely by Paystack — we do not store full card details</li>
          <li>Communication: messages with counsellors, support requests, feedback</li>
        </ul>
        <p>We also automatically collect: device type, browser, IP address, pages visited, and approximate location (for language detection).</p>

        <h2>3. How We Use Your Information</h2>
        <ul>
          <li>Provide and personalize career recommendations and AI insights</li>
          <li>Match students with counsellors and employers</li>
          <li>Process payments and manage subscriptions</li>
          <li>Send transactional emails (account, security, session reminders)</li>
          <li>Send product updates and marketing emails (only with your consent — you can opt out anytime)</li>
          <li>Improve the Service through analytics and aggregated research</li>
          <li>Detect fraud, abuse, and security incidents</li>
        </ul>

        <h2>4. AI Processing</h2>
        <p>Your assessment answers, CV content, and interview responses are processed by AI models (Google Gemini, OpenAI GPT) via the Lovable AI Gateway to generate recommendations. This data is sent for inference only and is not used to train third-party models.</p>

        <h2>5. Sharing Your Information</h2>
        <p>We do not sell your personal data. We share information only with:</p>
        <ul>
          <li>Service providers: Supabase (database/auth), Paystack (payments), Resend (email), Lovable AI Gateway (AI inference)</li>
          <li>Counsellors you book sessions with — they see only the information needed to support you</li>
          <li>Employers — only if you explicitly apply to a job posting or make your portfolio public</li>
          <li>Legal authorities — when required by law or to protect rights and safety</li>
        </ul>

        <h2>6. Cookies & Tracking</h2>
        <p>We use essential cookies for authentication and session management, and analytics cookies (where consented) to improve the Service. You can control cookies through your browser settings. Disabling essential cookies may break sign-in.</p>

        <h2>7. Data Security</h2>
        <p>We use industry-standard measures: HTTPS, encrypted storage, Row-Level Security on the database, hashed passwords, optional two-factor authentication. No system is 100% secure — please use a strong, unique password.</p>

        <h2>8. Data Retention</h2>
        <p>We keep your data for as long as your account is active. If you delete your account, we permanently remove your personal data within 30 days, except where retention is required by law (e.g., financial records).</p>

        <h2>9. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access, correct, or download your personal data</li>
          <li>Delete your account and associated data</li>
          <li>Withdraw consent for marketing emails at any time</li>
          <li>Object to certain processing activities</li>
        </ul>
        <p>To exercise these rights, email <a href="mailto:syncareer01@gmail.com" className="text-primary hover:underline">syncareer01@gmail.com</a>.</p>

        <h2>10. Children's Privacy</h2>
        <p>Syncareer is intended for users aged 16 and older. We do not knowingly collect data from children under 16. If we learn we have, we will delete it.</p>

        <h2>11. International Transfers</h2>
        <p>Your data may be processed in countries other than your own (e.g., the United States, European Union) by our service providers. We ensure appropriate safeguards are in place.</p>

        <h2>12. Changes to This Policy</h2>
        <p>We may update this Policy. Material changes will be communicated via email or in-app notice. Continued use after updates constitutes acceptance.</p>

        <h2>13. Contact</h2>
        <ul>
          <li>Email: <a href="mailto:syncareer01@gmail.com" className="text-primary hover:underline">syncareer01@gmail.com</a></li>
          <li>Website: <a href="https://syncareer.me" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://syncareer.me</a></li>
        </ul>
      </div>
    </div>
  );
}
