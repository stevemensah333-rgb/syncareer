import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ResetPasswordForm() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Password updated. Signing you in…');
      navigate('/', { replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not update password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur rounded-3xl shadow-[0_20px_60px_-30px_rgba(20,20,20,0.25)] ring-1 ring-black/[0.04] p-8">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="new-password" className="text-foreground/70 text-xs uppercase tracking-wider">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="!rounded-xl bg-white border border-black/[0.08] h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-password" className="text-foreground/70 text-xs uppercase tracking-wider">Confirm password</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="!rounded-xl bg-white border border-black/[0.08] h-11"
          />
        </div>
        <Button
          type="submit"
          disabled={submitting}
          className="w-full !rounded-full bg-foreground hover:bg-foreground/90 text-background h-11 shadow-sm"
        >
          {submitting ? 'Saving…' : 'Update password'}
        </Button>
      </form>
    </div>
  );
}
