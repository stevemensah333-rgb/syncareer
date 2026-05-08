import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function SubscriptionSuccessPage() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="text-center space-y-6 max-w-md">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
        <h2 className="text-2xl font-bold text-white">Premium Activated!</h2>
        <p className="text-slate-300">
          Your payment has been verified and premium features are now unlocked.
        </p>
        <Button
          onClick={() => navigate('/portfolio')}
          className="w-full bg-green-500 hover:bg-green-600 text-slate-900 font-semibold"
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
