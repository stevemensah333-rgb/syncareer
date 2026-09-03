import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { MessageScreen } from '@/components/layout/MessageScreen';

export default function SubscriptionSuccessPage() {
  const navigate = useNavigate();

  return (
    <MessageScreen
      eyebrow={
        <>
          <CheckCircle className="mr-1.5 inline h-4 w-4 align-text-bottom text-success" aria-hidden="true" />
          Payment verified
        </>
      }
      title="Premium activated"
      description="Your payment has been verified and premium features are now unlocked."
      actions={<Button onClick={() => navigate('/dashboard')}>Go to dashboard</Button>}
    />
  );
}
