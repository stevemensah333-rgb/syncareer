import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getHomeRouteForRole } from '@/components/auth/RoleRoute';
import { ANALYTICS_EVENTS, captureProductEvent } from '@/services/analytics';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
import { countries } from '@/utils/countries';
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
  const [countryCode, setCountryCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

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

      const profile = profileResult.data;
      if (profile?.onboarding_completed && isOnboardingRole(profile.user_type)) {
        navigate(getHomeRouteForRole(profile.user_type), { replace: true });
        return;
      }

      const metadataRole = session.user.user_metadata?.user_type;
      const role = profile
        ? isOnboardingRole(profile.user_type)
          ? profile.user_type
          : null
        : isOnboardingRole(metadataRole)
          ? metadataRole
          : 'student';

      if (!role) {
        throw new OnboardingFlowError(
          'Your account role is missing or unsupported. Contact support so it can be corrected safely.',
          'role',
        );
      }
      if (!profile && role === 'career_counsellor') {
        throw new OnboardingFlowError(
          'Your counsellor role has not been verified yet. Try again shortly or contact support.',
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
          .select('full_name, country_code, phone_number')
          .eq('user_id', session.user.id)
          .maybeSingle();
        if (detailsResult.error) {
          throw new OnboardingFlowError('We could not load your counsellor details. Try again to continue.', 'details');
        }
        if (!mounted.current) return;
        const details = detailsResult.data;
        setCounsellorFullName(details?.full_name?.trim() || fullName);
        setCountryCode(details?.country_code ?? '');
        setPhoneNumber(details?.phone_number ?? '');
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
  }, [navigate]);

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
        countryCode,
        phoneNumber,
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
          throw new OnboardingFlowError('Your counsellor role must be verified before setup can be completed.', 'role');
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
            country_code: countryCode,
            phone_number: phoneNumber.trim(),
          },
          { onConflict: 'user_id' },
        );
        if (detailsResult.error) throw detailsResult.error;
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
      navigate(getHomeRouteForRole(userType), { replace: true });
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
      eyebrow={isStudent ? 'Student profile' : 'Counsellor profile'}
      title={isStudent ? 'Add your study details' : 'Add your contact details'}
      subtitle={isStudent
        ? 'These details help Syncareer keep your opportunity and application context relevant.'
        : 'Students who book with you will use these details to identify and contact you.'}
      currentStep={2}
      totalSteps={2}
    >
      <form onSubmit={handleSubmit} noValidate>
        <Card>
          <CardHeader className="border-b">
            <CardTitle>{isStudent ? 'Education' : 'Professional contact'}</CardTitle>
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

                <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                  <div className="space-y-2">
                    <Label htmlFor="onboarding-country-code">Country code *</Label>
                    <Select value={countryCode} onValueChange={setCountryCode} disabled={saving}>
                      <SelectTrigger id="onboarding-country-code" aria-required="true">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        <ScrollArea className="h-64">
                          {countries.map((country) => (
                            <SelectItem key={`${country.code}-${country.name}`} value={`+${country.code}`}>
                              {country.name} (+{country.code})
                            </SelectItem>
                          ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="onboarding-phone">Phone number *</Label>
                    <Input
                      id="onboarding-phone"
                      name="tel"
                      autoComplete="tel-national"
                      value={phoneNumber}
                      onChange={(event) => setPhoneNumber(event.target.value)}
                      placeholder="e.g. 24 123 4567"
                      inputMode="tel"
                      required
                      maxLength={20}
                      disabled={saving}
                    />
                  </div>
                </div>

                <p className="rounded-lg border bg-muted/40 p-3 text-sm leading-6 text-muted-foreground">
                  Your phone number is shown only to clients who book a session with you. You can add your bio, specialisation, availability, and session price after setup.
                </p>
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
