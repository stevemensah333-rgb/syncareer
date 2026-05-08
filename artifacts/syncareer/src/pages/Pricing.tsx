import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import PaystackButton from '@/components/payment/PaystackButton';

export default function PricingPage() {
  const navigate = useNavigate();
  const { isPremium, loading } = useSubscription();
  const [selectedBilling, setSelectedBilling] = useState<'monthly' | 'yearly'>('monthly');

  const pricing = {
    monthly: { price: 30, amount: 3000 }, // pesewas
    yearly: { price: 300, amount: 30000 },
  };

  const features = {
    free: [
      'Portfolio projects: 3 uploads max',
      'AI Coach sessions: 5 per month',
      'Mock interviews: 3 per month (basic roles only)',
      'CV downloads: 2 exports per month (PDF only)',
      'Career assessments: 2 full assessments',
      'Job applications tracked: 10 active',
      'Analytics: Monthly summary report only',
    ],
    premium: [
      'Portfolio projects: Unlimited uploads',
      'AI Coach sessions: Unlimited',
      'Mock interviews: Unlimited + advanced role simulation',
      'CV downloads: Unlimited (multiple formats)',
      'Career assessments: Unlimited retakes',
      'Job applications tracked: Unlimited',
      'Analytics: Real-time dashboard',
      'Personalized AI career recommendations',
      'Priority support & early feature access',
    ],
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading pricing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-block px-4 py-2 bg-slate-700/50 rounded-full border border-slate-600">
            <span className="text-sm text-slate-300">Transparent Pricing</span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-balance">
            Unlock Your Career Potential
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Choose the plan that works for you. Pay with Mobile Money or Card.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-slate-700/50 rounded-lg p-1 border border-slate-600">
            <button
              onClick={() => setSelectedBilling('monthly')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                selectedBilling === 'monthly'
                  ? 'bg-slate-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setSelectedBilling('yearly')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                selectedBilling === 'yearly'
                  ? 'bg-slate-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Yearly
              <span className="ml-2 inline-block px-3 py-1 bg-green-500/20 text-green-300 text-xs rounded-full">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
          {/* Free Tier */}
          <Card className="bg-slate-800/50 border-slate-700 p-8 flex flex-col justify-between hover:bg-slate-800/70 transition-colors">
            <div>
              <h3 className="text-2xl font-bold mb-2">Free</h3>
              <p className="text-slate-400 mb-6">For exploration and early-stage students.</p>
              <div className="mb-8">
                <span className="text-4xl font-bold">GH₵0</span>
                <span className="text-slate-400 ml-2">forever</span>
              </div>
              <ul className="space-y-4 mb-8">
                {features.free.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Button
              variant="outline"
              className="w-full bg-slate-700 text-white border-slate-600 hover:bg-slate-600"
              disabled
            >
              {isPremium ? 'Downgrade' : 'Current Plan'}
            </Button>
          </Card>

          {/* Premium Tier */}
          <Card className="bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600 p-8 flex flex-col justify-between relative ring-2 ring-green-500/50">
            <div className="absolute -top-4 right-4 bg-green-500 text-slate-900 px-4 py-1 rounded-full text-sm font-semibold">
              Recommended
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">Premium</h3>
              <p className="text-slate-300 mb-6">For committed students serious about their careers.</p>
              <div className="mb-8">
                <span className="text-4xl font-bold">
                  GH₵{selectedBilling === 'monthly' ? '30' : '300'}
                </span>
                <span className="text-slate-400 ml-2">
                  {selectedBilling === 'monthly' ? '/month' : '/year'}
                </span>
                {selectedBilling === 'yearly' && (
                  <div className="text-sm text-green-400 mt-2">Save GH₵60/year vs monthly</div>
                )}
              </div>
              <ul className="space-y-4 mb-8">
                {features.premium.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-100">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {isPremium ? (
              <Button
                disabled
                className="w-full bg-green-500 text-slate-900 font-semibold"
              >
                Already Premium
              </Button>
            ) : (
              <PaystackButton
                plan={selectedBilling}
                onSuccess={() => navigate('/subscription-success')}
                className="w-full bg-green-500 text-slate-900 hover:bg-green-600 font-semibold"
              >
                Upgrade to Premium
              </PaystackButton>
            )}
          </Card>
        </div>

        {/* Payment Methods */}
        <div className="text-center mb-12">
          <p className="text-slate-400 text-sm">
            Accepted: MTN Mobile Money • Telecel Cash • AirtelTigo Money • Visa/Mastercard
          </p>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto border-t border-slate-700 pt-16">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
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
              <div key={idx} className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                <h3 className="font-semibold mb-2">{item.q}</h3>
                <p className="text-slate-300">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16 pt-12 border-t border-slate-700">
          <h3 className="text-2xl font-bold mb-4">Ready to accelerate your career?</h3>
          <p className="text-slate-300 mb-6">
            Join thousands of professionals transforming their careers with Syncareer.
          </p>
          {!isPremium && (
            <PaystackButton
              plan={selectedBilling}
              onSuccess={() => navigate('/subscription-success')}
              className="bg-green-500 text-slate-900 hover:bg-green-600 font-semibold px-8 py-3"
            >
              Get Started Today
            </PaystackButton>
          )}
        </div>
      </div>
    </div>
  );
}
