import { useRef, useState, type FormEvent } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, Camera, GraduationCap, HandHeart, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  PfChip,
  PfNote,
  PfOption,
  PfSectionHeading,
} from '@/components/pathfind/primitives';
import { ADMISSION_YEARS, DEGREE_TYPES, MAJORS } from '@/features/onboarding/constants';

/** Short explanations shown beside each degree type so the choice reads as a
 *  decision rather than a dropdown value. Any degree without a line simply
 *  shows its name. */
const DEGREE_HINT: Record<string, string> = {
  Certificate: 'Short professional programme, usually under a year.',
  Diploma: 'Two to three years, often at a technical institute.',
  'HND': 'Higher National Diploma from a technical university.',
  "Bachelor's": 'Standard undergraduate degree.',
  "Master's": 'Postgraduate study after a first degree.',
  PhD: 'Doctoral research degree.',
};

interface StudentSetupFormProps {
  userId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  school: string;
  onSchoolChange: (value: string) => void;
  major: string;
  onMajorChange: (value: string) => void;
  degreeType: string;
  onDegreeTypeChange: (value: string) => void;
  yearOfAdmission: string;
  onYearOfAdmissionChange: (value: string) => void;
  expectedCompletion: string;
  onExpectedCompletionChange: (value: string) => void;
  step: number;
  onStepChange: (step: number) => void;
  saving: boolean;
  formError: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

const STEP_TITLES = ['About you', 'Field of study', 'Timeline'];

/**
 * Student account setup in three named stages. Each stage asks for one kind of
 * thing, and every field maps to a real stored column — nothing is collected
 * that Syncareer does not use.
 */
export function StudentSetupForm({
  userId,
  fullName,
  email,
  avatarUrl,
  school,
  onSchoolChange,
  major,
  onMajorChange,
  degreeType,
  onDegreeTypeChange,
  yearOfAdmission,
  onYearOfAdmissionChange,
  expectedCompletion,
  onExpectedCompletionChange,
  step,
  onStepChange,
  saving,
  formError,
  onSubmit,
}: StudentSetupFormProps) {
  const [photo, setPhoto] = useState<string | null>(avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [stepError, setStepError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const handlePhoto = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Choose an image under 2 MB.');
      return;
    }
    setUploading(true);
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${userId}/avatar-${Date.now()}.${extension}`;
    const upload = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (upload.error) {
      setUploading(false);
      toast.error('Your photo could not be uploaded. You can add it later in Settings.');
      return;
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    const update = await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', userId);
    setUploading(false);
    if (update.error) {
      toast.error('Your photo could not be saved to your profile.');
      return;
    }
    setPhoto(data.publicUrl);
    toast.success('Photo updated');
  };

  const goNext = () => {
    if (step === 1 && !school.trim()) {
      setStepError('Add the school or university you attend.');
      return;
    }
    if (step === 2 && (!major || !degreeType)) {
      setStepError('Choose your field of study and the kind of programme you are on.');
      return;
    }
    setStepError('');
    onStepChange(Math.min(3, step + 1));
  };

  const completionYears = ADMISSION_YEARS.filter(
    (year) => !yearOfAdmission || year >= Number(yearOfAdmission),
  );

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
              title="About you"
              description="This is how mentors and your workspace will recognise you."
              meta="Step 1 of 3"
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
                  {uploading ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Camera aria-hidden="true" className="size-4" />}
                  {photo ? 'Change photo' : 'Upload photo'}
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">Optional. JPG or PNG, up to 2 MB.</p>
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
                <Label htmlFor="setup-name">Full name</Label>
                <Input id="setup-name" value={fullName} readOnly aria-readonly className="bg-secondary" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="setup-email">Email</Label>
                <Input id="setup-email" value={email} readOnly aria-readonly className="bg-secondary" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="onboarding-school">School or university *</Label>
                <Input
                  id="onboarding-school"
                  name="school"
                  autoComplete="organization"
                  value={school}
                  onChange={(event) => onSchoolChange(event.target.value)}
                  placeholder="e.g. Kwame Nkrumah University of Science and Technology"
                  maxLength={200}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="mt-7">
              <PfNote icon={<HandHeart aria-hidden="true" className="size-5" />} title="Syncareer is free">
                Every feature — opportunities, CV work, interview practice and mentors — is open to you at no cost.
              </PfNote>
            </div>
          </section>
        )}

        {step === 2 && (
          <section aria-label={STEP_TITLES[1]}>
            <PfSectionHeading
              title="Field of study"
              description="We use this to match opportunities and shape your CV guidance."
              meta="Step 2 of 3"
            />

            <p className="text-sm font-medium text-foreground">What are you studying?</p>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Field of study">
              {MAJORS.map((option) => (
                <PfChip
                  key={option}
                  label={option}
                  selected={major === option}
                  disabled={saving}
                  onSelect={() => onMajorChange(option)}
                />
              ))}
            </div>

            <p className="mt-8 text-sm font-medium text-foreground">What kind of programme?</p>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Programme type">
              {DEGREE_TYPES.map((option) => (
                <PfOption
                  key={option}
                  title={option}
                  description={DEGREE_HINT[option]}
                  selected={degreeType === option}
                  disabled={saving}
                  onSelect={() => onDegreeTypeChange(option)}
                />
              ))}
            </div>
          </section>
        )}

        {step === 3 && (
          <section aria-label={STEP_TITLES[2]}>
            <PfSectionHeading
              title="Timeline"
              description="Knowing where you are in your programme changes what we put in front of you."
              meta="Step 3 of 3"
            />

            <p className="text-sm font-medium text-foreground">Year you started</p>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Year of admission">
              {ADMISSION_YEARS.map((year) => (
                <PfChip
                  key={`start-${year}`}
                  label={String(year)}
                  selected={yearOfAdmission === String(year)}
                  disabled={saving}
                  onSelect={() => onYearOfAdmissionChange(String(year))}
                />
              ))}
            </div>

            <p className="mt-8 text-sm font-medium text-foreground">Year you expect to finish</p>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Expected completion">
              {completionYears.map((year) => (
                <PfChip
                  key={`end-${year}`}
                  label={String(year)}
                  selected={expectedCompletion === String(year)}
                  disabled={saving}
                  onSelect={() => onExpectedCompletionChange(String(year))}
                />
              ))}
            </div>

            <div className="mt-8">
              <PfNote icon={<GraduationCap aria-hidden="true" className="size-5" />} title="What happens next">
                Your workspace opens on one clear next step. You can change any of these details later in Settings.
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
          <p className="text-xs text-muted-foreground">You can update these details later in Settings.</p>
        )}

        {step < 3 ? (
          <Button type="button" size="lg" className="gap-2 sm:min-w-44" onClick={goNext}>
            Continue
            <ArrowRight aria-hidden="true" className="size-4" />
          </Button>
        ) : (
          <Button type="submit" size="lg" disabled={saving} aria-busy={saving} className="gap-2 sm:min-w-44">
            {saving ? (
              <>
                <Spinner className="size-4" />
                Saving profile…
              </>
            ) : (
              <>
                Finish setup
                <ArrowRight aria-hidden="true" className="size-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </form>
  );
}

export const STUDENT_SETUP_STEPS = STEP_TITLES;
