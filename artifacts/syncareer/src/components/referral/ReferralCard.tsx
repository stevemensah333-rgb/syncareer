import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gift, Copy, Check, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { WhatsAppShareButton } from '@/components/shared/WhatsAppShareButton';
import { toast } from '@/hooks/use-toast';

export const ReferralCard: React.FC = () => {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReferralData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const [codeRes, referralsRes] = await Promise.all([
        supabase.rpc('get_my_referral_code'),
        supabase.from('referrals').select('id').eq('referrer_id', session.user.id).eq('status', 'completed'),
      ]);

      if (codeRes.data) {
        setReferralCode(codeRes.data as string);
      }

      setReferralCount(referralsRes.data?.length || 0);
      setLoading(false);
    };

    fetchReferralData();
  }, []);

  if (loading || !referralCode) return null;

  const referralUrl = `${window.location.origin}/?ref=${referralCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      toast({ title: 'Copied!', description: 'Referral link copied to clipboard' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Error', description: 'Failed to copy', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gift className="h-5 w-5 text-primary" />
          Invite Friends
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Share Syncareer with a friend. When they sign up, you both get <span className="font-medium text-foreground">7 days of premium features</span>.
        </p>

        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
          <code className="flex-1 text-sm truncate font-mono">{referralCode}</code>
          <Button variant="ghost" size="icon" onClick={handleCopy} className="shrink-0 h-8 w-8">
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} className="flex-1">
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>
          <WhatsAppShareButton
            text="Join me on Syncareer — an AI-powered career platform for students. Use my referral code and we both get premium features!"
            url={referralUrl}
            className="flex-1"
          >
            Share on WhatsApp
          </WhatsAppShareButton>
        </div>

        {referralCount > 0 && (
          <div className="flex items-center gap-2 pt-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{referralCount}</span> friend{referralCount !== 1 ? 's' : ''} joined
            </span>
            <Badge variant="secondary" className="ml-auto text-xs">
              {referralCount * 7} days earned
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
