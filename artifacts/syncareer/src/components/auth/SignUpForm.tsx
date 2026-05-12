import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import GoogleSignInButton from './GoogleSignInButton';

const ROLE_OPTIONS = [
  { value: 'student', label: 'Student / Job seeker' },
  { value: 'career_counsellor', label: 'Career counsellor' },
];

export default function SignUpForm() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<string>('student');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            user_type: userType,
          },
          emailRedirectTo: `${window.location.origin}/sign-in`,
        },
      });
      if (error) throw error;

      // If email confirmation is required, there's no session yet.
      if (!data.session) {
        toast.success('Check your email to confirm your account, then sign in.');
        navigate('/sign-in', { replace: true });
        return;
      }

      // Logged in immediately — onboarding route will pick up user_type from auth metadata.
      toast.success('Welcome to Syncareer!');
      navigate('/onboarding', { replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? 'Sign up failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur rounded-3xl shadow-[0_20px_60px_-30px_rgba(20,20,20,0.25)] ring-1 ring-black/[0.04] p-8">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="full-name" className="text-foreground/70 text-xs uppercase tracking-wider">Full name</Label>
          <Input
            id="full-name"
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="!rounded-xl bg-white border border-black/[0.08] h-11"
          />
        </div>
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
          <Label htmlFor="password" className="text-foreground/70 text-xs uppercase tracking-wider">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="!rounded-xl bg-white border border-black/[0.08] h-11"
          />
          <p className="text-xs text-foreground/50">At least 8 characters.</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-foreground/70 text-xs uppercase tracking-wider">I'm joining as</Label>
          <Select value={userType} onValueChange={setUserType}>
            <SelectTrigger className="!rounded-xl bg-white border border-black/[0.08] h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="submit"
          disabled={submitting}
          className="w-full !rounded-full bg-foreground hover:bg-foreground/90 text-background h-11 shadow-sm"
        >
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
        <p className="text-center text-sm text-foreground/60">
          Already have an account?{' '}
          <Link to="/sign-in" className="text-primary hover:text-primary/80 font-medium">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
