import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import GoogleSignInButton from './GoogleSignInButton';

export default function SignInForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success('Welcome back!');
      navigate(from === '/sign-in' ? '/' : from, { replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? 'Sign in failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur rounded-3xl shadow-[0_20px_60px_-30px_rgba(20,20,20,0.25)] ring-1 ring-black/[0.04] p-8">
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
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="password" className="text-foreground/70 text-xs uppercase tracking-wider">Password</Label>
            <Link to="/sign-in/forgot-password" className="text-xs text-primary hover:text-primary/80">Forgot?</Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="!rounded-xl bg-white border border-black/[0.08] h-11"
          />
        </div>
        <Button
          type="submit"
          disabled={submitting}
          className="w-full !rounded-full bg-foreground hover:bg-foreground/90 text-background h-11 shadow-sm"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
        <p className="text-center text-sm text-foreground/60">
          New to Syncareer?{' '}
          <Link to="/sign-up" className="text-primary hover:text-primary/80 font-medium">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
