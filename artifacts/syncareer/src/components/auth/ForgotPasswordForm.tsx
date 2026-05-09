import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success('Reset link sent — check your inbox.');
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not send reset link');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur rounded-3xl shadow-[0_20px_60px_-30px_rgba(20,20,20,0.25)] ring-1 ring-black/[0.04] p-8">
      {sent ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-foreground/70">
            If an account exists for <strong>{email}</strong>, a reset link is on its way.
          </p>
          <Link to="/sign-in" className="text-primary hover:text-primary/80 text-sm font-medium">Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-foreground/70 text-xs uppercase tracking-wider">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="!rounded-xl bg-white border border-black/[0.08] h-11"
            />
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="w-full !rounded-full bg-foreground hover:bg-foreground/90 text-background h-11 shadow-sm"
          >
            {submitting ? 'Sending…' : 'Send reset link'}
          </Button>
          <p className="text-center text-sm text-foreground/60">
            <Link to="/sign-in" className="text-primary hover:text-primary/80">Back to sign in</Link>
          </p>
        </form>
      )}
    </div>
  );
}
