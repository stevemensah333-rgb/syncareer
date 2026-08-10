import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { z } from 'zod';
import { signupFormSchema, type SignupFormData } from '@/lib/validationSchemas';
import { trackEvent } from '@/services/analytics';

interface SignupWizardProps {
  onComplete: (data: SignupFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

type FormStep = 'email' | 'password' | 'profile' | 'confirm';

interface FormState {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  agreeToTerms: boolean;
}

interface StepErrors {
  [key: string]: string;
}

/**
 * Multi-step signup wizard for progressive onboarding
 */
export const SignupWizard: React.FC<SignupWizardProps> = ({
  onComplete,
  onCancel,
  isLoading = false,
}) => {
  const [currentStep, setCurrentStep] = useState<FormStep>('email');
  const [formData, setFormData] = useState<FormState>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    agreeToTerms: false,
  });
  const [errors, setErrors] = useState<StepErrors>({});

  const steps: FormStep[] = ['email', 'password', 'profile', 'confirm'];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  // Validate current step
  const validateStep = useCallback(async (step: FormStep): Promise<boolean> => {
    const newErrors: StepErrors = {};

    try {
      if (step === 'email') {
        z.object({ email: z.string().email('Invalid email') }).parse({
          email: formData.email,
        });
      } else if (step === 'password') {
        z.object({
          password: z.string().min(8, 'Password must be at least 8 characters'),
          confirmPassword: z.string(),
        }).refine((data) => data.password === data.confirmPassword, {
          message: 'Passwords do not match',
          path: ['confirmPassword'],
        }).parse({
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        });
      } else if (step === 'profile') {
        z.object({
          fullName: z.string().min(2, 'Name must be at least 2 characters'),
        }).parse({
          fullName: formData.fullName,
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.issues.forEach((issue) => {
          newErrors[issue.path[0] || 'general'] = issue.message;
        });
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    if (!isValid) return;

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]!);
      trackEvent({
        event: 'user_action',
        properties: {
          action_name: 'signup_step_progress',
          context: `moved_to_${steps[nextIndex]}`,
        },
      });
    }
  };

  const handlePrev = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]!);
    }
  };

  const handleSubmit = async () => {
    // Validate full form
    try {
      const validated = signupFormSchema.parse(formData);
      trackEvent({
        event: 'user_signup',
        properties: { user_type: 'student' },
      });
      onComplete(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: StepErrors = {};
        error.issues.forEach((issue) => {
          newErrors[issue.path[0] || 'general'] = issue.message;
        });
        setErrors(newErrors);
      }
    }
  };

  const handleChange = (field: keyof FormState, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    setErrors((prev) => {
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-foreground">
            Step {currentStepIndex + 1} of {steps.length}
          </p>
          <p className="text-sm text-foreground/60">{Math.round(progress)}%</p>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card>
        <CardHeader>
          {currentStep === 'email' && (
            <>
              <CardTitle>Create your account</CardTitle>
              <CardDescription>Enter your email to get started</CardDescription>
            </>
          )}
          {currentStep === 'password' && (
            <>
              <CardTitle>Set your password</CardTitle>
              <CardDescription>Make it strong and memorable</CardDescription>
            </>
          )}
          {currentStep === 'profile' && (
            <>
              <CardTitle>Tell us about you</CardTitle>
              <CardDescription>Help us personalize your experience</CardDescription>
            </>
          )}
          {currentStep === 'confirm' && (
            <>
              <CardTitle>You&apos;re all set</CardTitle>
              <CardDescription>Review your information</CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Email step */}
          {currentStep === 'email' && (
            <div className="space-y-3">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>
          )}

          {/* Password step */}
          {currentStep === 'password' && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  disabled={isLoading}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  disabled={isLoading}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>
            </div>
          )}

          {/* Profile step */}
          {currentStep === 'profile' && (
            <div className="space-y-3">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                disabled={isLoading}
              />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName}</p>
              )}
            </div>
          )}

          {/* Confirm step */}
          {currentStep === 'confirm' && (
            <div className="space-y-4 bg-muted/50 p-4 rounded-lg">
              <div>
                <p className="text-sm text-foreground/60">Email</p>
                <p className="font-medium">{formData.email}</p>
              </div>
              <div>
                <p className="text-sm text-foreground/60">Name</p>
                <p className="font-medium">{formData.fullName}</p>
              </div>
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.agreeToTerms}
                    onChange={(e) => handleChange('agreeToTerms', e.target.checked)}
                    disabled={isLoading}
                  />
                  <span className="text-sm text-foreground/70">
                    I agree to the{' '}
                    <a href="/terms" className="text-primary hover:underline">
                      Terms of Service
                    </a>
                  </span>
                </label>
              </div>
              {errors.agreeToTerms && (
                <p className="text-sm text-destructive">{errors.agreeToTerms}</p>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStepIndex === 0 || isLoading}
              className="flex-1 gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>

            {currentStep === 'confirm' ? (
              <Button
                onClick={handleSubmit}
                disabled={!formData.agreeToTerms || isLoading}
                className="flex-1 gap-2"
              >
                {isLoading ? 'Creating...' : 'Create Account'}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={isLoading}
                className="flex-1 gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Cancel button */}
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full"
          >
            Cancel
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
