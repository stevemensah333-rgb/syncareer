import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// Paystack plan codes from dashboard
export const PAYSTACK_PLAN_CODES = {
  monthly: 'PLN_bx3ss0zhrsafq2l',
  yearly: 'PLN_x4w58kpc58bqlqg',
} as const;

interface PaystackButtonProps {
  plan: 'monthly' | 'yearly';
  onSuccess?: () => void;
  onClose?: () => void;
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
}

export default function PaystackButton({
  plan,
  onSuccess,
  onClose,
  className,
  children,
  disabled,
}: PaystackButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  // Use the public key directly from environment — VITE_ vars are intentionally bundled into client code
  const paystackKeyRef = useRef<string | null>(import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || null);

  const verifyPayment = useCallback(
    async (reference: string) => {
      setIsVerifying(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { toast.error('Please log in to continue'); return; }

        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/verify-paystack-payment`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ reference, plan }),
          }
        );

        const result = await response.json();

        if (result.status === 'success') {
          toast.success('Premium activated! All features are now unlocked.', { duration: 5000 });
          // Small delay to let DB propagate, then trigger refetch
          setTimeout(() => {
            onSuccess?.();
          }, 800);
        } else {
          toast.error(result.message || result.error || 'Payment verification failed. Contact support.');
        }
      } catch (error) {
        console.error('Verification error:', error);
        toast.error('Failed to verify payment. Please contact support.');
      } finally {
        setIsVerifying(false);
      }
    },
    [plan, onSuccess]
  );

  const handlePayment = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast.error('Please log in to make a payment');
        setIsLoading(false);
        return;
      }

      if (!paystackKeyRef.current) {
        toast.error('Payment service is not configured. Please try again later.');
        setIsLoading(false);
        return;
      }

      // Load Paystack inline script if not already loaded
      if (!(window as any).PaystackPop) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://js.paystack.co/v2/inline.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Paystack'));
          document.head.appendChild(script);
        });
      }

      const handler = (window as any).PaystackPop.setup({
        key: paystackKeyRef.current,
        email: user.email,
        plan: PAYSTACK_PLAN_CODES[plan], // Paystack plan code — handles amount & currency
        currency: 'GHS',
        channels: ['card', 'mobile_money'],
        metadata: {
          user_id: user.id,
          plan,
          custom_fields: [
            { display_name: 'Plan', variable_name: 'plan', value: plan },
          ],
        },
        onSuccess: (transaction: { reference: string }) => {
          verifyPayment(transaction.reference);
        },
        onClose: () => {
          onClose?.();
          setIsLoading(false);
          toast.info('Payment window closed');
        },
      });

      handler.openIframe();
    } catch (error) {
      console.error('Payment init error:', error);
      toast.error('Could not initialize payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={disabled || isLoading || isVerifying}
      className={className}
    >
      {isLoading || isVerifying ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {isVerifying ? 'Verifying payment...' : 'Loading...'}
        </>
      ) : (
        children || 'Pay Now'
      )}
    </Button>
  );
}
