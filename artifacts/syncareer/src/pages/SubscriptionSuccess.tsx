import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { MessageScreen } from '@/components/layout/MessageScreen';
import { useNoIndex } from '@/hooks/useNoIndex';

export default function SubscriptionSuccessPage() {
  const navigate = useNavigate();

  // Post-payment confirmation is not indexable content.
  useNoIndex();

  return (
    <MessageScreen
      eyebrow={
        <>
          <CheckCircle className="mr-1.5 inline h-4 w-4 align-text-bottom text-success" aria-hidden="true" />
          Payment verified
        </>
      }
      title="Premium activated"
      description="Your payment has been verified and your Premium plan is active."
      actions={<Button onClick={() => navigate('/dashboard')}>Go to dashboard</Button>}
    />
  );
}
