import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

import { supabase } from '@/integrations/supabase/client';
import { getHomeRouteForRole } from '@/components/auth/RoleRoute';
import { getSafeReturnTo } from '@/components/auth/authUtils';
import { ANALYTICS_EVENTS, captureProductEvent } from '@/services/analytics';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { mentorshipApi } from '@/features/mentorship/api';
import { OnboardingShell } from '@/features/onboarding/OnboardingShell';
import { WelcomeScreen } from '@/features/onboarding/WelcomeScreen';
import { StudentSetupForm, STUDENT_SETUP_STEPS } from '@/features/onboarding/StudentSetupForm';
import { MentorSetupForm, MENTOR_SETUP_STEPS } from '@/features/onboarding/MentorSetupForm';
import {
  studentSchema,
  counsellorSchema,
  isOnboardingRole,
  type OnboardingRole,
} from '@/features/onboarding/constants';

const welcomeStorageKey = (uid: string) => `syncareer:onboarding-welcome-seen:${uid}`;

type InitialState = 'loading' | 'ready' | 'error';
type LoadErrorKind = 'session' | 'profile' | 'role' | 'details' | 'unknown';

class OnboardingFlowError extends Error {
  constructor(
    message: string,
    readonly kind: LoadErrorKind = 'unknown',
  ) {
    super(message);
    this.name = 'OnboardingFlowError';
  }
}

function safeErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const code = (error as Record<string, unknown>).code;
  return typeof code === 'string' ? code : null;
}

function isNetworkError(error: unknown): boolean {
  const message = error instanceof Error
    ? error.message
    : error && typeof error === 'object' && typeof (error as Record<string, unknown>).message === 'string'
      ? String((error as Record<string, unknown>).message)
      : '';
  return /failed to fetch|network|load failed|econn|fetch failed/i.test(message);
}

function loadErrorMessage(error: unknown): string {
  if (error instanceof OnboardingFlowError) return error.message;
  if (isNetworkError(error)) return 'We could not reach Syncareer. Check your connection and try again.';
  return 'We could not load your account setup. Try again to continue.';
}

function saveErrorMessage(error: unknown): string {
  if (error instanceof OnboardingFlowError) return error.message;
  const code = safeErrorCode(error);
  if (code === '42501') return 'Your account does not have permission to save these profile details. Refresh the page or contact support.';
  if (isNetworkError(error)) return 'We could not reach Syncareer. Check your connection and try again.';
  return 'Your profile could not be saved. Nothing was marked complete, so you can try again safely.';
}

const Onboarding = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get('returnTo'));
  const { refreshProfile } = useUserProfile();
  const mounted = useRef(true);
  const submissionInFlight = useRef(false);

  const [initialState, setInitialState] = useState<InitialState>('loading');
  const [initialError, setInitialError] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [profileExists, setProfileExists] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [studentStep, setStudentStep] = useState(1);
  const [userType, setUserType] = useState<OnboardingRole | null>(null);

  const [yearOfAdmission, setYearOfAdmission] = useState('');
  const [expectedCompletion, setExpectedCompletion] = useState('');
  const [major, setMajor] = useState('');
  const [school, setSchool] = useState('');
  const [degreeType, setDegreeType] = useState('');

  const [counsellorFullName, setCounsellorFullName] = useState('');
  const [currentRole, setCurrentRole] = useState('');
  const [organization, setOrganization] = useState('');
  const [mentorBio, setMentorBio] = useState('');
  const [expertise, setExpertise] = useState('');
  const [yearsExperience, setYearsExperience] = useState('0');
  const [mentorAvailability, setMentorAvailability] = useState('accepting');
  const [mentorStep, setMentorStep] = useState(1);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const initialise = useCallback(async () => {
    setInitialState('loading');
    setInitialError('');

    try {
      const sessionResult = await supabase.auth.getSession();
      if (sessionResult.error) throw sessionResult.error;
      const session = sessionResult.data.session;
      if (!session) {
        navigate('/sign-in', { replace: true });
        return;
      }

      const profileResult = await supabase
        .from('profiles')
        .select('full_name, onboarding_completed, user_type, avatar_url')
        .eq('id', session.user.id)
        .maybeSingle();
      if (profileResult.error) {
        throw new OnboardingFlowError('We could not load your profile. Try again to continue.', 'profile');
      }

      let profile = profileResult.data;
      if (!profile) {
        const initialiseResult = await supabase.rpc('initialize_my_profile_from_auth_metadata');
        if (initialiseResult.error) {
          throw new OnboardingFlowError('We could not initialize your profile. Try again to continue.', 'profile');
        }
        if (initialiseResult.data) {
          const refreshedProfileResult = await supabase
            .from('profiles')
            .select('full_name, onboarding_completed, user_type, avatar_url')
            .eq('id', session.user.id)
            .maybeSingle();
          if (refreshedProfileResult.error) {
            throw new OnboardingFlowError('We could not load your initialized profile. Try again to continue.', 'profile');
          }
          profile = refreshedProfileResult.data;
        }
      }

      if (profile?.onboarding_completed && isOnboardingRole(profile.user_type)) {
        navigate(returnTo === '/' ? getHomeRouteForRole(profile.user_type) : returnTo, { replace: true });
        return;
      }

      const role = profile
        ? isOnboardingRole(profile.user_type)
          ? profile.user_type
          : null
        : null;

      if (!role) {
        throw new OnboardingFlowError(
          'Your account role is missing or unsupported. Contact support so it can be corrected safely.',
          'role',
        );
      }

      const metadataName = typeof session.user.user_metadata?.full_name === 'string'
        ? session.user.user_metadata.full_name.trim()
        : '';
      const profileName = profile?.full_name?.trim() ?? '';
      const fullName = profileName || metadataName;
      const first = fullName.split(/\s+/)[0] ?? '';

      if (role === 'student') {
        const detailsResult = await supabase
          .from('student_details')
          .select('year_of_admission, expected_completion, major, school, degree_type')
          .eq('user_id', session.user.id)
          .maybeSingle();
        if (detailsResult.error) {
          throw new OnboardingFlowError('We could not load your study details. Try again to continue.', 'details');
        }
        if (!mounted.current) return;
        const details = detailsResult.data;
        if (details) {
          setYearOfAdmission(details.year_of_admission?.toString() ?? '');
          setExpectedCompletion(details.expected_completion?.toString() ?? '');
          setMajor(details.major ?? '');
          setSchool(details.school ?? '');
          setDegreeType(details.degree_type ?? '');
        }
      } else {
        const detailsResult = await supabase
          .from('counsellor_details')
          .select('full_name')
          .eq('user_id', session.user.id)
          .maybeSingle();
        if (detailsResult.error) {
          throw new OnboardingFlowError('We could not load your mentor details. Try again to continue.', 'details');
        }
        if (!mounted.current) return;
        const details = detailsResult.data;
        setCounsellorFullName(details?.full_name?.trim() || fullName);
      }

      let welcomeSeen = false;
      try {
        welcomeSeen = localStorage.getItem(welcomeStorageKey(session.user.id)) === '1';
      } catch {
        // A blocked localStorage does not block account setup.
      }

      if (!mounted.current) return;
      setUserId(session.user.id);
      setProfileExists(Boolean(profile));
      setFirstName(first);
      setDisplayName(fullName);
      setEmail(session.user.email ?? '');
      setAvatarUrl(profile?.avatar_url ?? null);
      setUserType(role);
      setShowWelcome(!welcomeSeen);
      setInitialState('ready');
    } catch (error) {
      if (!mounted.current) return;
      console.error('[Onboarding] Initial load failed', {
        kind: error instanceof OnboardingFlowError ? error.kind : isNetworkError(error) ? 'network' : 'unknown',
        code: safeErrorCode(error),
      });
      setInitialError(loadErrorMessage(error));
      setInitialState('error');
    }
  }, [navigate, returnTo]);

  useEffect(() => {
    void initialise();
  }, [initialise]);

  const dismissWelcome = () => {
    if (userId) {
      try {
        localStorage.setItem(welcomeStorageKey(userId), '1');
      } catch {
        // Welcome persistence is optional; account setup remains usable.
      }
    }
    setShowWelcome(false);
  };

  const handleYearOfAdmissionChange = (year: string) => {
    setYearOfAdmission(year);
    if (expectedCompletion && Number(expectedCompletion) < Number(year)) {
      setExpectedCompletion('');
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId || !userType || submissionInFlight.current) return;

    setFormError('');
    if (userType === 'student') {
      const result = studentSchema.safeParse({
        school,
        major,
        degreeType,
        yearOfAdmission,
        expectedCompletion,
      });
      if (!result.success) {
        setFormError(result.error.issues[0]?.message ?? 'Check the highlighted details and try again.');
        return;
      }
    } else {
      const result = counsellorSchema.safeParse({
        fullName: counsellorFullName,
        currentRole,
        organization,
        bio: mentorBio,
        expertise,
        yearsExperience,
      });
      if (!result.success) {
        setFormError(result.error.issues[0]?.message ?? 'Check the highlighted details and try again.');
        return;
      }
    }

    submissionInFlight.current = true;
    setSaving(true);

    try {
      if (!profileExists) {
        if (userType !== 'student') {
          throw new OnboardingFlowError('Your mentor role must be verified before setup can be completed.', 'role');
        }
        const profileInsert = await supabase.from('profiles').insert({
          id: userId,
          user_type: 'student',
          onboarding_completed: false,
        });
        if (profileInsert.error) throw profileInsert.error;
        setProfileExists(true);
      }

      if (userType === 'student') {
        const detailsResult = await supabase.from('student_details').upsert(
          {
            user_id: userId,
            year_of_admission: yearOfAdmission ? Number(yearOfAdmission) : null,
            expected_completion: expectedCompletion ? Number(expectedCompletion) : null,
            major,
            school: school.trim() || null,
            degree_type: degreeType,
          },
          { onConflict: 'user_id' },
        );
        if (detailsResult.error) throw detailsResult.error;
      } else {
        const detailsResult = await supabase.from('counsellor_details').upsert(
          {
            user_id: userId,
            full_name: counsellorFullName.trim(),
            country_code: '',
            phone_number: '',
          },
          { onConflict: 'user_id' },
        );
        if (detailsResult.error) throw detailsResult.error;
        await mentorshipApi.updateProfile({
          fullName: counsellorFullName,
          currentRole,
          bio: mentorBio,
          expertiseTags: expertise.split(',').map((tag) => tag.trim()).filter(Boolean),
          yearsExperience: Number(yearsExperience),
          availabilityStatus: mentorAvailability,
        });
        await mentorshipApi.submitVerification(organization);
      }

      const profileUpdate = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          ...(userType === 'career_counsellor' ? { full_name: counsellorFullName.trim() } : {}),
        })
        .eq('id', userId)
        .select('id')
        .maybeSingle();
      if (profileUpdate.error) throw profileUpdate.error;
      if (!profileUpdate.data) {
        throw new OnboardingFlowError('Your profile could not be confirmed after saving. Refresh and try again.', 'profile');
      }

      captureProductEvent(ANALYTICS_EVENTS.ONBOARDING_COMPLETED, { user_role: userType });
      await refreshProfile();
      toast.success('Profile setup complete');
      navigate(returnTo === '/' ? getHomeRouteForRole(userType) : returnTo, { replace: true });
    } catch (error) {
      console.error('[Onboarding] Save failed', {
        kind: error instanceof OnboardingFlowError ? error.kind : isNetworkError(error) ? 'network' : 'database',
        code: safeErrorCode(error),
      });
      setFormError(saveErrorMessage(error));
    } finally {
      submissionInFlight.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  if (initialState === 'loading') {
    return (
      <OnboardingShell eyebrow="Account setup" title="Loading your profile" subtitle="We’re checking your saved details before you continue.">
        <Card aria-busy="true">
          <CardContent className="flex min-h-32 items-center justify-center gap-3 p-6" role="status" aria-live="polite">
            <Spinner className="size-5 text-primary" />
            <span className="text-sm text-muted-foreground">Loading account setup…</span>
          </CardContent>
        </Card>
      </OnboardingShell>
    );
  }

  if (initialState === 'error' || !userType) {
    return (
      <OnboardingShell eyebrow="Account setup" title="Setup could not be loaded" subtitle="Your account has not been changed.">
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>We could not continue</AlertTitle>
          <AlertDescription>{initialError || 'Your account role could not be loaded.'}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button type="button" variant="outline" onClick={() => void initialise()} className="gap-2">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
        </div>
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

  const isStudent = userType === 'student';

  if (isStudent) {
    return (
      <OnboardingShell
        eyebrow="Student setup"
        title="Set up your career workspace"
        subtitle="Three short stages. Everything you enter here shapes the opportunities, CV guidance and mentors you see."
        steps={STUDENT_SETUP_STEPS}
        currentStep={studentStep}
      >
        <StudentSetupForm
          userId={userId!}
          fullName={displayName}
          email={email}
          avatarUrl={avatarUrl}
          school={school}
          onSchoolChange={setSchool}
          major={major}
          onMajorChange={setMajor}
          degreeType={degreeType}
          onDegreeTypeChange={setDegreeType}
          yearOfAdmission={yearOfAdmission}
          onYearOfAdmissionChange={handleYearOfAdmissionChange}
          expectedCompletion={expectedCompletion}
          onExpectedCompletionChange={setExpectedCompletion}
          step={studentStep}
          onStepChange={setStudentStep}
          saving={saving}
          formError={formError}
          onSubmit={handleSubmit}
        />
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell
      eyebrow="Mentor setup"
      title="Build your mentor profile"
      subtitle="Four short stages. What you enter here is what students see when they look for a mentor."
      steps={MENTOR_SETUP_STEPS}
      currentStep={mentorStep}
    >
      <MentorSetupForm
        userId={userId!}
        email={email}
        avatarUrl={avatarUrl}
        fullName={counsellorFullName}
        onFullNameChange={setCounsellorFullName}
        currentRole={currentRole}
        onCurrentRoleChange={setCurrentRole}
        organization={organization}
        onOrganizationChange={setOrganization}
        bio={mentorBio}
        onBioChange={setMentorBio}
        expertise={expertise}
        onExpertiseChange={setExpertise}
        yearsExperience={yearsExperience}
        onYearsExperienceChange={setYearsExperience}
        availabilityStatus={mentorAvailability}
        onAvailabilityStatusChange={setMentorAvailability}
        step={mentorStep}
        onStepChange={setMentorStep}
        saving={saving}
        formError={formError}
        onSubmit={handleSubmit}
      />
    </OnboardingShell>
  );
};

export default Onboarding;
