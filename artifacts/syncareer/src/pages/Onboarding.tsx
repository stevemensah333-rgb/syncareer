import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getHomeRouteForRole } from '@/components/auth/RoleRoute';
import { useUserProfile } from '@/contexts/UserProfileContext';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { z } from 'zod';
import { countries } from '@/utils/countries';

// Validation schemas
const studentSchema = z.object({
  school: z.string().max(200, 'School name must be less than 200 characters').optional(),
  major: z.string().min(1, 'Major is required'),
  degreeType: z.string().min(1, 'Degree type is required'),
});

const counsellorSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(100, 'Name must be less than 100 characters'),
  countryCode: z.string().min(1, 'Country code is required'),
  phoneNumber: z.string().trim().min(1, 'Phone number is required').max(20, 'Phone number must be less than 20 characters'),
});

const MAJORS = [
  'Computer Science',
  'Business Administration',
  'Law',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Information Technology',
  'Data Science',
  'Finance',
  'Accounting',
  'Marketing',
  'Human Resources',
  'Economics',
  'Psychology',
  'Medicine',
  'Nursing',
  'Pharmacy',
  'Architecture',
  'Graphic Design',
  'Communications',
  'Education',
  'Environmental Science',
  'Agriculture',
  'Other',
];

const DEGREE_TYPES = [
  'Certificate',
  'Diploma',
  'Associate Degree',
  'Bachelor\'s Degree',
  'Honours Degree',
  'Postgraduate Diploma',
  'Master\'s Degree',
  'Doctoral Degree (PhD)',
  'Professional Degree',
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 20 }, (_, i) => currentYear - 10 + i);

const Onboarding = () => {
  const navigate = useNavigate();
  const { refreshProfile } = useUserProfile();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [firstName, setFirstName] = useState<string>('');

  const welcomeStorageKey = (uid: string) => `syncareer:onboarding-welcome-seen:${uid}`;
  const dismissWelcome = () => {
    if (userId) {
      try {
        localStorage.setItem(welcomeStorageKey(userId), '1');
      } catch {
        // ignore storage errors (private mode, quota, etc.)
      }
    }
    setShowWelcome(false);
  };

  // User type from signup (no longer selected here)
  const [userType, setUserType] = useState<string>('');

  // Student fields
  const [yearOfAdmission, setYearOfAdmission] = useState<string>('');
  const [expectedCompletion, setExpectedCompletion] = useState<string>('');
  const [major, setMajor] = useState<string>('');
  const [school, setSchool] = useState<string>('');
  const [degreeType, setDegreeType] = useState<string>('');

  // Reset expected completion if it becomes invalid when year of admission changes
  const handleYearOfAdmissionChange = (year: string) => {
    setYearOfAdmission(year);
    if (expectedCompletion && parseInt(expectedCompletion) < parseInt(year)) {
      setExpectedCompletion('');
    }
  };

  // Counsellor fields
  const [counsellorFullName, setCounsellorFullName] = useState<string>('');
  const [countryCode, setCountryCode] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/');
        return;
      }
      setUserId(session.user.id);

      // Show welcome only on first visit per user (persisted in localStorage)
      try {
        const seen = localStorage.getItem(welcomeStorageKey(session.user.id));
        if (!seen) setShowWelcome(true);
      } catch {
        setShowWelcome(true);
      }

      // Pre-fill counsellor name from auth metadata
      const userFullName = session.user.user_metadata?.full_name;
      if (userFullName) {
        setCounsellorFullName(userFullName);
        const first = String(userFullName).trim().split(/\s+/)[0];
        if (first) setFirstName(first);
      }

      // Get user type from profile (set during signup)
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed, user_type')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profile?.onboarding_completed) {
        const homeRoute = getHomeRouteForRole(profile.user_type);
        navigate(homeRoute);
        return;
      }

      // Use user_type from profile or from auth metadata
      const type = profile?.user_type || session.user.user_metadata?.user_type || '';
      setUserType(type);
      setInitialLoading(false);
    };

    checkSession();
  }, [navigate]);

  const handleSubmit = async () => {
    if (!userId) return;

    // Validate with zod schemas
    if (userType === 'student') {
      const result = studentSchema.safeParse({ school, major, degreeType });
      if (!result.success) {
        toast.error(result.error.errors[0]?.message ?? "Validation failed");
        return;
      }
    } else if (userType === 'career_counsellor') {
      const result = counsellorSchema.safeParse({
        fullName: counsellorFullName.trim(),
        countryCode,
        phoneNumber: phoneNumber.trim(),
      });
      if (!result.success) {
        toast.error(result.error.errors[0]?.message ?? "Validation failed");
        return;
      }
    }

    setLoading(true);

    try {
      // Write role-specific details FIRST. Only after they succeed do we set
      // onboarding_completed=true on the profile, so a partial failure doesn't
      // route a half-onboarded user into the dashboard.
      // RLS policies use auth.uid() which now matches the signed-in user's id.
      if (userType === 'student') {
        const { error } = await supabase.from('student_details').upsert(
          {
            user_id: userId,
            year_of_admission: yearOfAdmission ? parseInt(yearOfAdmission, 10) : null,
            expected_completion: expectedCompletion ? parseInt(expectedCompletion, 10) : null,
            major,
            school: school || null,
            degree_type: degreeType,
          },
          { onConflict: 'user_id' },
        );
        if (error) throw error;
      } else if (userType === 'career_counsellor') {
        const { error } = await supabase.from('counsellor_details').upsert(
          {
            user_id: userId,
            full_name: counsellorFullName.trim(),
            country_code: countryCode,
            phone_number: phoneNumber.trim(),
          },
          { onConflict: 'user_id' },
        );
        if (error) throw error;
      }

      const profilePayload = {
        id: userId,
        user_type: userType,
        onboarding_completed: true,
        ...(userType === 'career_counsellor' ? { full_name: counsellorFullName.trim() } : {}),
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' });
      if (profileError) throw profileError;

      toast.success('Profile setup complete!');
      // Refresh the cached profile so RoleRoute sees onboarding_completed=true
      // and doesn't bounce us back to /onboarding.
      await refreshProfile();
      const homeRoute = getHomeRouteForRole(userType);
      navigate(homeRoute, { replace: true });
    } catch (error: any) {
      console.error('Onboarding error:', error);
      toast.error(error.message || 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <OnboardingShell eyebrow="Setting things up" title="One moment" italicWord="moment" subtitle="">
        <div className="text-center text-foreground/60">Loading...</div>
      </OnboardingShell>
    );
  }

  if (showWelcome) {
    return (
      <WelcomeScreen
        firstName={firstName}
        userType={userType}
        onContinue={dismissWelcome}
      />
    );
  }

  const shellProps =
    userType === 'student'
      ? {
          eyebrow: 'A few details',
          title: 'Tell us about your studies',
          italicWord: 'studies',
          subtitle: 'We use this to tailor recommendations, courses, and roles to your field.',
        }
      : userType === 'career_counsellor'
      ? {
          eyebrow: 'Counsellor profile',
          title: 'Set up your practice',
          italicWord: 'practice',
          subtitle: 'How students will reach you when they book a session.',
        }
      : {
          eyebrow: 'Welcome to Syncareer',
          title: 'Choose how you want to start',
          italicWord: 'start',
          subtitle: 'Pick the role that best fits you — you can always change details later.',
        };

  return (
    <OnboardingShell {...shellProps}>
      <div className="bg-white/95 backdrop-blur rounded-3xl shadow-[0_20px_60px_-30px_rgba(20,20,20,0.25)] ring-1 ring-black/[0.04] p-6 sm:p-10">

        {userType === 'student' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Major / Field of Study *</Label>
                <Select value={major} onValueChange={setMajor}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select your major" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    {MAJORS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Degree Type *</Label>
                <Select value={degreeType} onValueChange={setDegreeType}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select degree type" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    {DEGREE_TYPES.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>School / University</Label>
                <Input
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="Enter your school name"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label>Year of Admission</Label>
                <Select value={yearOfAdmission} onValueChange={handleYearOfAdmissionChange}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    {years.map((y) => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Expected Completion</Label>
                <Select value={expectedCompletion} onValueChange={setExpectedCompletion}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    {years
                      .filter((y) => !yearOfAdmission || y >= parseInt(yearOfAdmission))
                      .map((y) => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSubmit} disabled={loading || !major || !degreeType} className="rounded-full px-8 h-12 bg-foreground text-background hover:bg-foreground/90">
                {loading ? 'Saving...' : 'Complete setup'}
              </Button>
            </div>
          </div>
        )}

        {userType === 'career_counsellor' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={counsellorFullName}
                  onChange={(e) => setCounsellorFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="h-12"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Country Code *</Label>
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      <ScrollArea className="h-[200px]">
                        {countries.map((country) => (
                          <SelectItem key={country.code} value={`+${country.code}`}>
                            {country.name} (+{country.code})
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Phone Number *</Label>
                  <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter phone number"
                    className="h-12"
                    type="tel"
                  />
                </div>
              </div>

              <p className="text-sm text-foreground/60">
                Your phone number will be visible to clients who book sessions with you.
                You can update your bio, specialization, and hiring price after completing setup.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSubmit} disabled={loading || !counsellorFullName || !countryCode || !phoneNumber} className="rounded-full px-8 h-12 bg-foreground text-background hover:bg-foreground/90">
                {loading ? 'Saving...' : 'Complete setup'}
              </Button>
            </div>
          </div>
        )}

        {!userType && !initialLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { value: 'student', label: 'Student', description: 'Discover careers, build your CV, and prepare for interviews' },
              { value: 'career_counsellor', label: 'Career Counsellor', description: 'Guide students and manage counselling sessions' },
            ].map((role) => (
              <button
                key={role.value}
                onClick={() => setUserType(role.value)}
                className="group p-6 rounded-2xl bg-white ring-1 ring-black/[0.06] hover:ring-primary/40 hover:shadow-[0_12px_32px_-20px_rgba(20,20,20,0.25)] text-left transition-all space-y-2"
              >
                <h3 className="font-serif text-2xl font-normal text-foreground tracking-[-0.01em]">{role.label}</h3>
                <p className="text-sm text-foreground/60 leading-relaxed">{role.description}</p>
                <span className="inline-flex items-center gap-1 pt-2 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Continue →
                </span>
              </button>
            ))}
          </div>
        )}

      </div>
    </OnboardingShell>
  );
};

function OnboardingShell({
  eyebrow,
  title,
  italicWord,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  italicWord: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const titleParts = title.split(italicWord);
  return (
    <div
      className="relative min-h-screen flex items-start sm:items-center justify-center px-4 py-12 overflow-hidden"
      style={{ backgroundColor: 'hsl(var(--landing-cream))' }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full blur-3xl"
        style={{ backgroundColor: 'hsl(var(--landing-amber) / 0.18)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 h-[32rem] w-[32rem] rounded-full blur-3xl"
        style={{ backgroundColor: 'hsl(var(--primary) / 0.07)' }}
      />
      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur px-3.5 py-1.5 text-[11px] font-medium text-foreground/70 shadow-sm ring-1 ring-black/[0.04] mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          {eyebrow}
        </span>
        <h1 className="font-serif text-4xl sm:text-5xl font-normal leading-[1.05] tracking-[-0.02em] text-foreground text-center">
          {titleParts[0]}
          <span className="italic text-primary">{italicWord}</span>
          {titleParts[1]}
        </h1>
        {subtitle && (
          <p className="mt-4 max-w-md text-center text-foreground/60 text-sm sm:text-base leading-relaxed">
            {subtitle}
          </p>
        )}
        <div className="mt-10 w-full">{children}</div>
      </div>
    </div>
  );
}

function WelcomeScreen({
  firstName,
  userType,
  onContinue,
}: {
  firstName: string;
  userType: string;
  onContinue: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const greetingName = firstName ? `, ${firstName}` : '';
  const benefits =
    userType === 'career_counsellor'
      ? [
          'Set up your practice and accept bookings',
          'Run sessions with built-in scheduling',
          'Build your reputation through ratings',
        ]
      : [
          'A 5-minute assessment to surface careers that fit',
          'An ATS-ready CV and an AI interview coach',
          'Real jobs, mentors, and a community to grow with',
        ];

  useEffect(() => {
    buttonRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) {
          return;
        }
        e.preventDefault();
        onContinue();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onContinue]);

  return (
    <OnboardingShell
      eyebrow="Welcome to Syncareer"
      title={`Glad you're here${greetingName}`}
      italicWord="here"
      subtitle="Take a moment — here's what's waiting for you on the other side of setup."
    >
      <div className="bg-white/95 backdrop-blur rounded-3xl shadow-[0_20px_60px_-30px_rgba(20,20,20,0.25)] ring-1 ring-black/[0.04] p-6 sm:p-10">
        <ul className="space-y-5">
          {benefits.map((b, i) => (
            <li key={i} className="flex items-start gap-4">
              <span className="mt-1 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-primary/10 font-serif text-sm text-primary">
                {i + 1}
              </span>
              <span className="text-foreground/80 leading-relaxed text-base">{b}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between gap-4 pt-8">
          <span className="text-xs text-foreground/50 hidden sm:inline">
            Tip: press Enter to continue
          </span>
          <Button
            ref={buttonRef}
            onClick={onContinue}
            className="rounded-full px-8 h-12 bg-foreground text-background hover:bg-foreground/90 ml-auto"
          >
            Let's go
          </Button>
        </div>
      </div>
    </OnboardingShell>
  );
}

export default Onboarding;
