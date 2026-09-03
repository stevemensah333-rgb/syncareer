import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import PaystackButton from '@/components/payment/PaystackButton';
import AnimatedSection from '@/components/landing/AnimatedSection';
import { setMetaTags } from '@/lib/seo';

export default function PricingPage() {
  const navigate = useNavigate();
  const { isPremium, loading } = useSubscription();
  const [selectedBilling, setSelectedBilling] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    setMetaTags({
      title: 'Pricing — Syncareer Free & Premium Plans',
      description: 'Simple pricing for African graduates. Start free; upgrade to Premium for unlimited assessments, CV exports, mock interviews, and contextual assistance.',
      ogTitle: 'Syncareer Pricing — Free & Premium Plans',
      ogDescription: 'Free forever tier plus a Premium plan with unlimited assessments, interviews, and contextual assistance.',
      ogUrl: 'https://syncareer.me/pricing',
      ogImage: 'https://syncareer.me/og-image.png',
      ogImageWidth: 1200,
      ogImageHeight: 630,
      ogImageAlt: 'Syncareer — Turn a real opportunity into a stronger application.',
      canonical: 'https://syncareer.me/pricing',
      twitterCard: 'summary_large_image',
      twitterTitle: 'Syncareer Pricing — Free & Premium Plans',
      twitterDescription: 'Free forever tier plus a Premium plan with unlimited assessments, interviews, and contextual assistance.',
      twitterImage: 'https://syncareer.me/og-image.png',
    });
  }, []);

  const features = {
    free: [
      
      'Assistant proposals: 5 per month',
      'Mock interviews: 3 per month (basic roles only)',
      'CV downloads: 2 exports per month (PDF only)',
      'Career assessments: 2 full assessments',
      'Job applications tracked: 10 active',
      'Analytics: Monthly summary report only',
    ],
    premium: [
      
      'Assistant proposals: Unlimited',
      'Mock interviews: Unlimited + advanced role simulation',
      'CV downloads: Unlimited (multiple formats)',
      'Career assessments: Unlimited retakes',
      'Job applications tracked: Unlimited',
      'Analytics: Real-time dashboard',
      'Career recommendations for your profile',
      'Priority support',
    ],
  };

  if (loading) {
    return (
      <main id="main-content" className="flex items-center justify-center min-h-screen" role="status" aria-live="polite">
        <div className="space-y-4 text-center">
          <Spinner className="mx-auto size-6 text-muted-foreground" />
          <p className="type-secondary">Loading pricing…</p>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" className="surface-canvas min-h-screen py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <AnimatedSection y={20}>
        <div className="text-center mb-16 space-y-4">
          <p className="type-label text-primary">Transparent pricing</p>
          <h1 className="type-display text-balance">
            Free to start. Upgrade when you need more.
          </h1>
          <p className="type-secondary mx-auto max-w-2xl text-base">
            Choose the plan that works for you. Pay with Mobile Money or Card.
          </p>
        </div>
        </AnimatedSection>

        {/* Billing Toggle */}
        <AnimatedSection delay={0.08} y={20}>
        <div className="flex justify-center mb-12">
          <div className="inline-flex rounded-control border border-border bg-muted p-1">
            <button
              onClick={() => setSelectedBilling('monthly')}
              className={`rounded-control px-6 py-2 text-sm font-medium transition-colors ${
                selectedBilling === 'monthly'
                  ? 'bg-card text-foreground shadow-card'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setSelectedBilling('yearly')}
              className={`rounded-control px-6 py-2 text-sm font-medium transition-colors ${
                selectedBilling === 'yearly'
                  ? 'bg-card text-foreground shadow-card'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Yearly
              <span className="ml-2 inline-block rounded-full border border-success/25 bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                Save 17%
              </span>
            </button>
          </div>
        </div>
        </AnimatedSection>

        {/* Pricing Cards */}
        <AnimatedSection delay={0.12} y={20}>
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
          {/* Free Tier */}
          <Card className="flex flex-col justify-between p-8">
            <div>
              <h2 className="type-section-title mb-2 text-2xl">Free</h2>
              <p className="type-secondary mb-6">For exploration and early-stage students.</p>
              <div className="mb-8">
                <span className="text-4xl font-semibold tracking-[-0.02em]">GH₵0</span>
                <span className="type-secondary ml-2">forever</span>
              </div>
              <ul className="space-y-4 mb-8">
                {features.free.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" aria-hidden="true" />
                    <span className="type-body">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Button variant="outline" className="w-full" disabled>
              {isPremium ? 'Downgrade' : 'Current Plan'}
            </Button>
          </Card>

          {/* Premium Tier */}
          <Card className="relative flex flex-col justify-between border-primary p-8">
            <div className="absolute -top-3 right-4 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
              Recommended
            </div>
            <div>
              <h2 className="type-section-title mb-2 text-2xl">Premium</h2>
              <p className="type-secondary mb-6">For students applying and interviewing regularly.</p>
              <div className="mb-8">
                <span className="text-4xl font-semibold tracking-[-0.02em]">
                  GH₵{selectedBilling === 'monthly' ? '30' : '300'}
                </span>
                <span className="type-secondary ml-2">
                  {selectedBilling === 'monthly' ? '/month' : '/year'}
                </span>
                {selectedBilling === 'yearly' && (
                  <div className="mt-2 text-sm font-medium text-success">Save GH₵60/year vs monthly</div>
                )}
              </div>
              <ul className="space-y-4 mb-8">
                {features.premium.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" aria-hidden="true" />
                    <span className="type-body">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {isPremium ? (
              <Button disabled className="w-full">
                Already Premium
              </Button>
            ) : (
              <PaystackButton
                plan={selectedBilling}
                onSuccess={() => navigate('/subscription-success')}
                className="w-full"
              >
                Upgrade to Premium
              </PaystackButton>
            )}
          </Card>
        </div>
        </AnimatedSection>

        {/* Payment Methods */}
        <AnimatedSection delay={0.16} y={20}>
        <div className="text-center mb-12">
          <p className="type-secondary">
            Accepted: MTN Mobile Money • Telecel Cash • AirtelTigo Money • Visa/Mastercard
          </p>
        </div>
        </AnimatedSection>

        {/* FAQ Section */}
        <AnimatedSection delay={0.2} y={20}>
        <div className="mx-auto max-w-3xl border-t border-border pt-16">
          <h2 className="type-section-title mb-12 text-center text-2xl sm:text-3xl">Frequently asked questions</h2>
          <div className="space-y-6">
            {[
              {
                q: 'What payment methods do you accept?',
                a: 'We accept MTN Mobile Money, Telecel Cash, AirtelTigo Money, Visa, and Mastercard through Paystack.',
              },
              {
                q: 'Can I change plans anytime?',
                a: 'Yes! Upgrade your plan at any time. Changes take effect immediately.',
              },
              {
                q: 'Is there a free trial?',
                a: 'The free tier gives you full access to core features. No trial needed — start using it right away.',
              },
              {
                q: 'Do you offer refunds?',
                a: 'We offer a 30-day money-back guarantee on annual plans. Contact support for details.',
              },
            ].map((item, idx) => (
              <div key={idx} className="surface-content p-6">
                <h3 className="type-section-title mb-2 text-base">{item.q}</h3>
                <p className="type-secondary">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
        </AnimatedSection>

        {/* CTA Section */}
        <AnimatedSection delay={0.24} y={20}>
        <div className="mt-16 border-t border-border pt-12 text-center">
          <h2 className="type-section-title mb-4 text-2xl">Want more from Syncareer?</h2>
          <p className="type-secondary mb-6">
            Upgrade to remove the limits on assessments, mock interviews, and CV exports.
          </p>
          {!isPremium && (
            <PaystackButton
              plan={selectedBilling}
              onSuccess={() => navigate('/subscription-success')}
              className="px-8"
            >
              Upgrade to Premium
            </PaystackButton>
          )}
        </div>
        </AnimatedSection>
      </div>
    </main>
  );
}
