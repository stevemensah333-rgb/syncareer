import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import AnimatedSection from '@/components/landing/AnimatedSection';

export default function SubscriptionSuccessPage() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <AnimatedSection y={20} className="text-center max-w-md">
        <div className="space-y-6">
          <AnimatedSection y={16}>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          </AnimatedSection>
          <AnimatedSection delay={0.08} y={16}>
            <h2 className="text-2xl font-bold text-white">Premium Activated!</h2>
          </AnimatedSection>
          <AnimatedSection delay={0.12} y={16}>
            <p className="text-slate-300">
              Your payment has been verified and premium features are now unlocked.
            </p>
          </AnimatedSection>
          <AnimatedSection delay={0.16} y={16}>
            <Button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-green-500 hover:bg-green-600 text-slate-900 font-semibold"
            >
              Go to Dashboard
            </Button>
          </AnimatedSection>
        </div>
      </AnimatedSection>
    </div>
  );
}
