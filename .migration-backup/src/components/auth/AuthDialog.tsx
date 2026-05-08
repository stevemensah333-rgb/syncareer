import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, User, Lock, Mail, GraduationCap, Briefcase, Users } from 'lucide-react';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const signUpSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(100, 'Full name must be less than 100 characters'),
  email: z.string().trim().email('Invalid email address').max(255, 'Email must be less than 255 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

const signInSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMode?: 'signin' | 'signup';
}

type UserRole = 'student' | 'employer' | 'career_counsellor' | null;

export default function AuthDialog({ open, onOpenChange, defaultMode = 'signin' }: AuthDialogProps) {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(defaultMode === 'signup');
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Reset state when dialog opens/closes or defaultMode changes
  React.useEffect(() => {
    if (open) {
      setIsSignUp(defaultMode === 'signup');
      setSelectedRole(null);
      setShowVerificationMessage(false);
      setEmail('');
      setPassword('');
      setFullName('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setAgreedToTerms(false);
    }
  }, [open, defaultMode]);

  const ensureProfileRow = async (userId: string, metadata?: { full_name?: string; avatar_url?: string; user_type?: string }) => {
    const upsertData: { id: string; full_name?: string; avatar_url?: string; user_type?: string } = { id: userId };
    if (metadata?.full_name) upsertData.full_name = metadata.full_name;
    if (metadata?.avatar_url) upsertData.avatar_url = metadata.avatar_url;
    if (metadata?.user_type) upsertData.user_type = metadata.user_type;

    const { error } = await supabase
      .from('profiles')
      .upsert(upsertData, { onConflict: 'id', ignoreDuplicates: false });

    if (error) throw error;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = signUpSchema.safeParse({ 
      fullName: fullName.trim(), 
      email: email.trim(), 
      password 
    });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!agreedToTerms) {
      toast.error('You must agree to the Terms and Conditions');
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: fullName.trim(), user_type: selectedRole }
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('This email is already registered. Please sign in instead.');
        } else {
          toast.error(error.message);
        }
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setShowVerificationMessage(true);
          toast.success('Please check your email to verify your account!');
        } else {
          try {
            await ensureProfileRow(session.user.id, { user_type: selectedRole || undefined });
          } catch (e) {
            console.error('Error ensuring profile row after sign up:', e);
          }
          toast.success('Account created successfully!');
          onOpenChange(false);
          navigate('/onboarding');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
        extraParams: {
          prompt: 'select_account',
        },
      });

      if (error) {
        toast.error(error.message || 'An error occurred with Google sign in');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred with Google sign in');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = signInSchema.safeParse({ email: email.trim(), password });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
      } else {
        if (!rememberMe && data.session) {
          localStorage.setItem('syncareer_session_only', 'true');
        } else {
          localStorage.removeItem('syncareer_session_only');
        }
        toast.success('Welcome back!');
        onOpenChange(false);
        
        // Fetch user role from DB and redirect to correct dashboard
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_type, onboarding_completed')
          .eq('id', data.user!.id)
          .single();
        
        if (!profileData?.onboarding_completed) {
          navigate('/onboarding');
        } else {
          const { getHomeRouteForRole } = await import('@/components/auth/RoleRoute');
          navigate(getHomeRouteForRole(profileData?.user_type || null));
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.error('Please enter your email address first');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Password reset email sent! Check your inbox.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        }
      });
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Verification email sent! Check your inbox.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend verification email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {showVerificationMessage ? 'Check your email' : isSignUp ? 'Create Account' : 'Welcome Back'}
          </DialogTitle>
        </DialogHeader>

        {showVerificationMessage ? (
          <div className="text-center space-y-4 py-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <p className="text-muted-foreground text-sm">
              We've sent a verification link to <span className="font-medium text-foreground">{email}</span>.
            </p>
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleResendVerification}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Sending...' : 'Resend verification email'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowVerificationMessage(false);
                  setIsSignUp(false);
                }}
                className="w-full"
              >
                Back to login
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {!isSignUp ? (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="remember-dialog" 
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <Label htmlFor="remember-dialog" className="text-muted-foreground cursor-pointer text-xs">
                      Remember Me
                    </Label>
                  </div>
                  <button 
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-primary hover:underline text-xs"
                  >
                    Forgot Password?
                  </button>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <Button 
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  className="w-full"
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(true);
                      setSelectedRole(null);
                    }}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign Up
                  </button>
                </p>
              </form>
            ) : (
              isSignUp && !selectedRole ? (
                <div className="space-y-4">
                  <p className="text-center text-sm text-muted-foreground mb-4">
                    Choose how you want to use Syncareer
                  </p>
                  <div className="grid gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedRole('student')}
                      className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">Student</p>
                        <p className="text-xs text-muted-foreground">Build your portfolio and find opportunities</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRole('employer')}
                      className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Employer</p>
                        <p className="text-xs text-muted-foreground">Post jobs and find talent</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRole('career_counsellor')}
                      className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <Users className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">Career Counsellor</p>
                        <p className="text-xs text-muted-foreground">Guide students and professionals</p>
                      </div>
                    </button>
                  </div>
                  <p className="text-center text-sm text-muted-foreground pt-2">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(false);
                        setSelectedRole(null);
                      }}
                      className="text-primary hover:underline font-medium"
                    >
                      Sign In
                    </button>
                  </p>
                </div>
              ) : isSignUp ? (
                <form onSubmit={handleSignUp} className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setSelectedRole(null)}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
                  >
                    ← Back to role selection
                  </button>
                  
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Full Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="pl-10"
                    />
                  </div>

                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10"
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="terms-agree"
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                    />
                    <Label htmlFor="terms-agree" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
                      I agree to the{' '}
                      <a
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-medium"
                      >
                        Terms and Conditions
                      </a>
                    </Label>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading || !agreedToTerms}>
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  <Button 
                    type="button"
                    variant="outline"
                    onClick={handleGoogleSignIn}
                    className="w-full"
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(false);
                        setSelectedRole(null);
                      }}
                      className="text-primary hover:underline font-medium"
                    >
                      Sign In
                    </button>
                  </p>
                </form>
              ) : null
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
