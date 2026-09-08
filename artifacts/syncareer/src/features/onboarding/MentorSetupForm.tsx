import { useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Camera,
  CalendarClock,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { uploadAvatar } from '@/features/profile/avatarUpload';
import { toast } from 'sonner';
import {
  PfChip,
  PfNote,
  PfOption,
  PfSectionHeading,
} from '@/components/pathfind/primitives';

const STEP_TITLES = ['Identity', 'Expertise', 'Availability', 'Review'];

/** Suggested guidance topics. Mentors can add their own, so this is a
 *  starting point rather than a fixed vocabulary. */
const EXPERTISE_SUGGESTIONS = [
  'CV and résumé review',
  'Interview preparation',
  'Career transitions',
  'Graduate school applications',
  'Software engineering',
  'Data and analytics',
  'Finance and accounting',
  'Marketing and communications',
  'Product and design',
  'Entrepreneurship',
  'Public sector and NGOs',
  'Networking and outreach',
];

const EXPERIENCE_BANDS = ['1', '3', '5', '8', '10', '15', '20'];

const AVAILABILITY_OPTIONS: { value: string; title: string; description: string }[] = [
  {
    value: 'accepting',
    title: 'Accepting requests',
    description: 'Students can send you requests now. You review each one before accepting.',
  },
  {
    value: 'limited',
    title: 'Limited availability',
    description: 'You stay listed, but students are told you take only a few requests at a time.',
  },
  {
    value: 'paused',
    title: 'Paused for now',
    description: 'You will not receive requests until you turn this back on in your mentor account.',
  },
];

interface MentorSetupFormProps {
  userId: string;
  email: string;
  avatarUrl: string | null;
  fullName: string;
  onFullNameChange: (value: string) => void;
  currentRole: string;
  onCurrentRoleChange: (value: string) => void;
  organization: string;
  onOrganizationChange: (value: string) => void;
  bio: string;
  onBioChange: (value: string) => void;
  /** Comma-separated expertise tags, matching the stored shape. */
  expertise: string;
  onExpertiseChange: (value: string) => void;
  yearsExperience: string;
  onYearsExperienceChange: (value: string) => void;
  availabilityStatus: string;
  onAvailabilityStatusChange: (value: string) => void;
  step: number;
  onStepChange: (step: number) => void;
  saving: boolean;
  formError: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

/**
 * Mentor account setup in four named stages: who you are and where you work,
 * what you can help with, how much time you are offering, and a final review
 * with the mentoring commitment. Every field maps to a stored mentor-profile
 * column — nothing is collected that Syncareer does not use.
 */
export function MentorSetupForm({
  userId,
  email,
  avatarUrl,
  fullName,
  onFullNameChange,
  currentRole,
  onCurrentRoleChange,
  organization,
  onOrganizationChange,
  bio,
  onBioChange,
  expertise,
  onExpertiseChange,
  yearsExperience,
  onYearsExperienceChange,
  availabilityStatus,
  onAvailabilityStatusChange,
  step,
  onStepChange,
  saving,
  formError,
  onSubmit,
}: MentorSetupFormProps) {
  const [photo, setPhoto] = useState<string | null>(avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [stepError, setStepError] = useState('');
  const [customTag, setCustomTag] = useState('');
  const [agreed, setAgreed] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const tags = expertise.split(',').map((tag) => tag.trim()).filter(Boolean);
  const suggestions = [...EXPERTISE_SUGGESTIONS, ...tags.filter((tag) => !EXPERTISE_SUGGESTIONS.includes(tag))];

  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const toggleTag = (tag: string) => {
    const next = tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag];
    onExpertiseChange(next.join(', '));
  };

  const addCustomTag = () => {
    const value = customTag.trim();
    if (!value) return;
    if (!tags.includes(value)) onExpertiseChange([...tags, value].join(', '));
    setCustomTag('');
  };

  const handlePhoto = async (file: File) => {
    setUploading(true);
    try {
      // The mentor record may not exist yet during onboarding; the submit step
      // carries this URL into counsellor_details.
      const publicUrl = await uploadAvatar(userId, file, { isMentor: false });
      setPhoto(publicUrl);
      onPhotoChange?.(publicUrl);
      toast.success('Photo updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Your photo could not be uploaded.');
    } finally {
      setUploading(false);
    }
  };

  const goNext = () => {
    if (step === 1 && (!fullName.trim() || currentRole.trim().length < 2 || organization.trim().length < 2)) {
      setStepError('Add your name, your current role and the organisation you work for.');
      return;
    }
    if (step === 2 && (tags.length === 0 || bio.trim().length < 20)) {
      setStepError('Choose at least one topic and write a short introduction (20 characters or more).');
      return;
    }
    if (step === 3 && !availabilityStatus) {
      setStepError('Choose how available you are right now.');
      return;
    }
    setStepError('');
    onStepChange(Math.min(4, step + 1));
  };

  const chosenAvailability = AVAILABILITY_OPTIONS.find((option) => option.value === availabilityStatus);

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="pf-card p-6 sm:p-8">
        {(formError || stepError) && (
          <Alert variant={formError ? 'destructive' : 'warning'} className="mb-6">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>{formError ? 'Profile not saved' : 'One more detail'}</AlertTitle>
            <AlertDescription>{formError || stepError}</AlertDescription>
          </Alert>
        )}

        {step === 1 && (
          <section aria-label={STEP_TITLES[0]}>
            <PfSectionHeading
              title="Who you are"
              description="Students see this on your mentor card, so keep it recognisable and current."
              meta="Step 1 of 4"
            />

            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <span className="flex size-20 items-center justify-center overflow-hidden rounded-pill bg-secondary text-xl font-semibold text-foreground">
                {photo ? (
                  <img src={photo} alt="" className="size-full object-cover" />
                ) : (
                  initials || <Camera aria-hidden="true" className="size-6 text-muted-foreground" />
                )}
              </span>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  disabled={uploading}
                  onClick={() => fileInput.current?.click()}
                >
                  {uploading ? (
                    <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
                  ) : (
                    <Camera aria-hidden="true" className="size-4" />
                  )}
                  {photo ? 'Change photo' : 'Upload photo'}
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  Optional. A clear head-and-shoulders photo, JPG or PNG, up to 2 MB.
                </p>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file) void handlePhoto(file);
                  }}
                />
              </div>
            </div>

            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="onboarding-full-name">Full name *</Label>
                <Input
                  id="onboarding-full-name"
                  name="name"
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => onFullNameChange(event.target.value)}
                  placeholder="Enter your full name"
                  maxLength={100}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="setup-email">Work email</Label>
                <Input id="setup-email" value={email} readOnly aria-readonly className="bg-secondary" />
                <p className="text-xs text-muted-foreground">Never shown to students.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="onboarding-role">Current role *</Label>
                <Input
                  id="onboarding-role"
                  value={currentRole}
                  maxLength={120}
                  onChange={(event) => onCurrentRoleChange(event.target.value)}
                  placeholder="e.g. Product Designer"
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onboarding-org">Organisation *</Label>
                <Input
                  id="onboarding-org"
                  autoComplete="organization"
                  value={organization}
                  maxLength={160}
                  onChange={(event) => onOrganizationChange(event.target.value)}
                  placeholder="e.g. Ecobank Ghana"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="mt-7">
              <PfNote icon={<ShieldCheck aria-hidden="true" className="size-5" />} title="Verification before you are listed">
                Your profile stays hidden until the Syncareer team confirms your organisation email. Your email and
                phone number are never shown to students.
              </PfNote>
            </div>
          </section>
        )}

        {step === 2 && (
          <section aria-label={STEP_TITLES[1]}>
            <PfSectionHeading
              title="What you can help with"
              description="Students search by topic, so pick the areas where you can give specific, practical guidance."
              meta="Step 2 of 4"
            />

            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-foreground">Guidance topics *</p>
              <p className="text-xs text-muted-foreground">{tags.length} selected</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Guidance topics">
              {suggestions.map((option) => (
                <PfChip
                  key={option}
                  label={option}
                  selected={tags.includes(option)}
                  disabled={saving}
                  onSelect={() => toggleTag(option)}
                />
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <div className="flex-1 space-y-2">
                <Label htmlFor="onboarding-custom-tag">Add another topic</Label>
                <Input
                  id="onboarding-custom-tag"
                  value={customTag}
                  maxLength={60}
                  disabled={saving}
                  placeholder="e.g. Actuarial science"
                  onChange={(event) => setCustomTag(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addCustomTag();
                    }
                  }}
                />
              </div>
              <Button type="button" variant="outline" className="sm:mt-8" onClick={addCustomTag} disabled={saving}>
                Add topic
              </Button>
            </div>

            <p className="mt-8 text-sm font-medium text-foreground">Years of professional experience *</p>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Years of experience">
              {EXPERIENCE_BANDS.map((band) => (
                <PfChip
                  key={band}
                  label={`${band}+ years`}
                  selected={yearsExperience === band}
                  disabled={saving}
                  onSelect={() => onYearsExperienceChange(band)}
                />
              ))}
            </div>

            <div className="mt-8 space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Label htmlFor="onboarding-bio">Your introduction *</Label>
                <span className="text-xs text-muted-foreground">{bio.length} / 1000</span>
              </div>
              <Textarea
                id="onboarding-bio"
                value={bio}
                maxLength={1000}
                rows={6}
                disabled={saving}
                onChange={(event) => onBioChange(event.target.value)}
                placeholder="Describe the experience and perspective you can offer students, and the kind of questions you are happy to take."
              />
              <p className="text-xs text-muted-foreground">This appears in full on your public mentor profile.</p>
            </div>
          </section>
        )}

        {step === 3 && (
          <section aria-label={STEP_TITLES[2]}>
            <PfSectionHeading
              title="How much time you are offering"
              description="You are in control. Nothing is booked without your approval, and you can change this at any time."
              meta="Step 3 of 4"
            />

            <div className="grid gap-2.5" role="radiogroup" aria-label="Availability">
              {AVAILABILITY_OPTIONS.map((option) => (
                <PfOption
                  key={option.value}
                  title={option.title}
                  description={option.description}
                  selected={availabilityStatus === option.value}
                  disabled={saving}
                  onSelect={() => onAvailabilityStatusChange(option.value)}
                />
              ))}
            </div>

            <div className="mt-8">
              <PfNote icon={<CalendarClock aria-hidden="true" className="size-5" />} title="How requests reach you">
                Students send a written request with their goal and any supporting work. You read it first and decide
                whether to accept. Contact details are exchanged only after you accept.
              </PfNote>
            </div>
          </section>
        )}

        {step === 4 && (
          <section aria-label={STEP_TITLES[3]}>
            <PfSectionHeading
              title="Review and confirm"
              description="Check what students will see, then confirm the mentoring commitment."
              meta="Step 4 of 4"
            />

            <dl className="divide-y divide-border rounded-[1rem] border border-border">
              <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <dt className="text-sm text-muted-foreground">Name and role</dt>
                <dd className="min-w-0 text-sm font-medium text-foreground sm:text-right">
                  {fullName || '—'}
                  {currentRole && <span className="block font-normal text-muted-foreground">{currentRole}</span>}
                </dd>
              </div>
              <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <dt className="text-sm text-muted-foreground">Organisation</dt>
                <dd className="text-sm font-medium text-foreground sm:text-right">{organization || '—'}</dd>
              </div>
              <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <dt className="text-sm text-muted-foreground">Experience</dt>
                <dd className="text-sm font-medium text-foreground sm:text-right">{yearsExperience || '0'}+ years</dd>
              </div>
              <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <dt className="text-sm text-muted-foreground">Guidance topics</dt>
                <dd className="min-w-0 text-sm font-medium text-foreground sm:text-right">
                  {tags.length ? tags.join(', ') : '—'}
                </dd>
              </div>
              <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <dt className="text-sm text-muted-foreground">Availability</dt>
                <dd className="text-sm font-medium text-foreground sm:text-right">
                  {chosenAvailability?.title ?? '—'}
                </dd>
              </div>
            </dl>

            <div className="mt-6">
              <PfOption
                control="checkbox"
                title="I will mentor students honestly and respectfully"
                description="I will give guidance based on my own experience, keep what students share confidential, and decline requests I cannot help with rather than leaving them waiting."
                selected={agreed}
                disabled={saving}
                onSelect={() => setAgreed((value) => !value)}
              />
            </div>

            <div className="mt-6">
              <PfNote icon={<ShieldCheck aria-hidden="true" className="size-5" />} title="Mentoring on Syncareer is voluntary">
                There is no fee to students and no payment to mentors. You decide how many requests you take.
              </PfNote>
            </div>
          </section>
        )}
      </div>

      <div className="mt-6 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        {step > 1 ? (
          <Button
            type="button"
            variant="ghost"
            className="gap-2"
            onClick={() => {
              setStepError('');
              onStepChange(Math.max(1, step - 1));
            }}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">You can update these details later in your mentor account.</p>
        )}

        {step < 4 ? (
          <Button type="button" size="lg" className="gap-2 sm:min-w-44" onClick={goNext}>
            Continue
            <ArrowRight aria-hidden="true" className="size-4" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="lg"
            disabled={saving || !agreed}
            aria-busy={saving}
            className="gap-2 sm:min-w-44"
          >
            {saving ? (
              <>
                <Spinner className="size-4" />
                Saving profile…
              </>
            ) : (
              <>
                Submit for verification
                <ArrowRight aria-hidden="true" className="size-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </form>
  );
}

export const MENTOR_SETUP_STEPS = STEP_TITLES;
