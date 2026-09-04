import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getHomeRouteForRole } from '@/components/auth/RoleRoute';
import { getSafeReturnTo } from '@/components/auth/authUtils';
import { ANALYTICS_EVENTS, captureProductEvent } from '@/services/analytics';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { mentorshipApi } from '@/features/mentorship/api';
import { OnboardingShell } from '@/features/onboarding/OnboardingShell';
import { WelcomeScreen } from '@/features/onboarding/WelcomeScreen';
import {
  MAJORS,
  DEGREE_TYPES,
  ADMISSION_YEARS,
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
        .select('full_name, onboarding_completed, user_type')
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
            .select('full_name, onboarding_completed, user_type')
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
          availabilityStatus: 'paused',
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
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
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

  return (
    <OnboardingShell
      eyebrow={isStudent ? 'Student profile' : 'Mentor profile'}
      title={isStudent ? 'Add your study details' : 'Build your mentor profile'}
      subtitle={isStudent
        ? 'These details help Syncareer keep your opportunity and application context relevant.'
        : 'Your organization email and professional details will be reviewed before your profile is listed.'}
      currentStep={2}
      totalSteps={2}
    >
      <form onSubmit={handleSubmit} noValidate>
        <Card>
          <CardHeader className="border-b">
            <CardTitle>{isStudent ? 'Education' : 'Professional profile'}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Fields marked with <span aria-hidden="true">*</span><span className="sr-only">an asterisk</span> are required.
            </p>
          </CardHeader>
          <CardContent className="space-y-5 p-5 sm:p-6">
            {formError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertTitle>Profile not saved</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            {isStudent ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="onboarding-major">Major / field of study *</Label>
                  <Select value={major} onValueChange={setMajor} disabled={saving}>
                    <SelectTrigger id="onboarding-major" aria-required="true">
                      <SelectValue placeholder="Select your major" />
                    </SelectTrigger>
                    <SelectContent>
                      {MAJORS.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="onboarding-degree">Degree type *</Label>
                  <Select value={degreeType} onValueChange={setDegreeType} disabled={saving}>
                    <SelectTrigger id="onboarding-degree" aria-required="true">
                      <SelectValue placeholder="Select degree type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEGREE_TYPES.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="onboarding-school">School / university</Label>
                  <Input
                    id="onboarding-school"
                    name="school"
                    autoComplete="organization"
                    value={school}
                    onChange={(event) => setSchool(event.target.value)}
                    placeholder="Enter your school name"
                    maxLength={200}
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="onboarding-admission">Year of admission</Label>
                  <Select value={yearOfAdmission} onValueChange={handleYearOfAdmissionChange} disabled={saving}>
                    <SelectTrigger id="onboarding-admission">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {ADMISSION_YEARS.map((year) => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="onboarding-completion">Expected completion</Label>
                  <Select value={expectedCompletion} onValueChange={setExpectedCompletion} disabled={saving}>
                    <SelectTrigger id="onboarding-completion">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {ADMISSION_YEARS
                        .filter((year) => !yearOfAdmission || year >= Number(yearOfAdmission))
                        .map((year) => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="onboarding-full-name">Full name *</Label>
                  <Input
                    id="onboarding-full-name"
                    name="name"
                    autoComplete="name"
                    required
                    value={counsellorFullName}
                    onChange={(event) => setCounsellorFullName(event.target.value)}
                    placeholder="Enter your full name"
                    maxLength={100}
                    disabled={saving}
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="onboarding-role">Current role *</Label><Input id="onboarding-role" value={currentRole} maxLength={120} onChange={(e) => setCurrentRole(e.target.value)} placeholder="e.g. Product Designer" /></div><div className="space-y-2"><Label htmlFor="onboarding-org">Organization *</Label><Input id="onboarding-org" autoComplete="organization" value={organization} maxLength={160} onChange={(e) => setOrganization(e.target.value)} /></div></div>
                <div className="space-y-2"><Label htmlFor="onboarding-bio">Professional bio *</Label><Textarea id="onboarding-bio" value={mentorBio} maxLength={1000} rows={5} onChange={(e) => setMentorBio(e.target.value)} placeholder="Describe the experience and perspective you can offer students." /></div>
                <div className="grid gap-5 md:grid-cols-[1fr_180px]"><div className="space-y-2"><Label htmlFor="onboarding-expertise">Expertise *</Label><Input id="onboarding-expertise" value={expertise} onChange={(e) => setExpertise(e.target.value)} placeholder="CV review, Data analytics, Fintech" /><p className="text-xs text-muted-foreground">Separate tags with commas.</p></div><div className="space-y-2"><Label htmlFor="onboarding-years">Years of experience *</Label><Input id="onboarding-years" type="number" min={0} max={60} value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} /></div></div>
                <p className="rounded-lg border bg-muted/40 p-3 text-sm leading-6 text-muted-foreground">Your profile remains hidden while the Syncareer team verifies your confirmed organization email. Contact details are exchanged only after you accept a request.</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col-reverse items-stretch justify-between gap-3 border-t p-5 sm:flex-row sm:items-center sm:p-6">
            <p className="text-xs text-muted-foreground">You can update these details later in Settings.</p>
            <Button type="submit" disabled={saving} aria-busy={saving} className="gap-2 sm:min-w-40">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Saving profile…
                </>
              ) : (
                <>
                  Complete setup
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </OnboardingShell>
  );
};

export default Onboarding;
