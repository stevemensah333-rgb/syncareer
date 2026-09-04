import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import {
  ADMISSION_YEARS,
  DEGREE_TYPES,
  MAJORS,
  studentSchema,
} from '@/features/onboarding/constants';
import { SettingField, SettingsEditor, SettingsGroup, SettingsRow, SettingsValue } from './SettingsScaffold';

interface EducationForm {
  school: string;
  major: string;
  degreeType: string;
  yearOfAdmission: string;
  expectedCompletion: string;
}

/**
 * The student's primary programme. `student_details` is written by account
 * setup (same upsert, same validation), so editing it here reuses the exact
 * contract instead of inventing a new one.
 */
export function EducationSection() {
  const { profile, studentDetails, refreshProfile } = useUserProfile();
  const { userId } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<EducationForm>(emptyEducationForm);

  if (profile?.user_type !== 'student') return null;

  const startEdit = () => {
    setForm({
      school: studentDetails?.school ?? '',
      major: studentDetails?.major ?? '',
      degreeType: studentDetails?.degree_type ?? '',
      yearOfAdmission: studentDetails?.year_of_admission ? String(studentDetails.year_of_admission) : '',
      expectedCompletion: studentDetails?.expected_completion ? String(studentDetails.expected_completion) : '',
    });
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    if (!userId) return;
    const parsed = studentSchema.safeParse({
      school: form.school,
      major: form.major,
      degreeType: form.degreeType,
      yearOfAdmission: form.yearOfAdmission,
      expectedCompletion: form.expectedCompletion,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the highlighted details and try again.');
      return;
    }

    setSaving(true);
    const { error: saveError } = await supabase
      .from('student_details')
      .upsert(
        {
          user_id: userId,
          school: form.school.trim() || null,
          major: form.major,
          degree_type: form.degreeType,
          year_of_admission: form.yearOfAdmission ? Number(form.yearOfAdmission) : null,
          expected_completion: form.expectedCompletion ? Number(form.expectedCompletion) : null,
        },
        { onConflict: 'user_id' },
      );
    setSaving(false);

    if (saveError) {
      setError(saveError.message || 'Your studies could not be saved.');
      return;
    }
    await refreshProfile();
    setEditing(false);
    toast.success('Studies updated');
  };

  const completionYears = ADMISSION_YEARS.filter(
    (year) => !form.yearOfAdmission || year >= Number(form.yearOfAdmission),
  );

  return (
    <SettingsGroup
      title="Education"
      description="Your current programme — the one account setup asked for."
      action={
        !editing && (
          <Button variant="outline" size="sm" onClick={startEdit}>
            {studentDetails ? 'Edit' : 'Add'}
          </Button>
        )
      }
    >
      {studentDetails ? (
        <>
          <SettingsRow label="School or university">
            <SettingsValue>{studentDetails.school || 'Not added'}</SettingsValue>
          </SettingsRow>
          <SettingsRow label="Major">
            <SettingsValue>{studentDetails.major}</SettingsValue>
          </SettingsRow>
          <SettingsRow label="Degree">
            <SettingsValue>{studentDetails.degree_type}</SettingsValue>
          </SettingsRow>
          <SettingsRow label="Years">
            <SettingsValue>
              {studentDetails.year_of_admission ?? '—'} – {studentDetails.expected_completion ?? '—'}
            </SettingsValue>
          </SettingsRow>
        </>
      ) : (
        <p className="workspace-row type-supporting">
          Your programme has not been recorded yet. Add it so opportunities and CV guidance can refer to it.
        </p>
      )}

      {editing && (
        <SettingsEditor>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <SettingField id="education-school" label="School or university">
                <Input
                  id="education-school"
                  value={form.school}
                  maxLength={200}
                  autoComplete="organization"
                  onChange={(event) => setForm({ ...form, school: event.target.value })}
                />
              </SettingField>
              <SettingField id="education-major" label="Major">
                <Select value={form.major} onValueChange={(value) => setForm({ ...form, major: value })}>
                  <SelectTrigger id="education-major">
                    <SelectValue placeholder="Select your major" />
                  </SelectTrigger>
                  <SelectContent>
                    {MAJORS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingField>
              <SettingField id="education-degree" label="Degree type">
                <Select value={form.degreeType} onValueChange={(value) => setForm({ ...form, degreeType: value })}>
                  <SelectTrigger id="education-degree">
                    <SelectValue placeholder="Select degree type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEGREE_TYPES.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingField>
              <SettingField id="education-admission" label="Year of admission">
                <Select
                  value={form.yearOfAdmission}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      yearOfAdmission: value,
                      expectedCompletion:
                        form.expectedCompletion && Number(form.expectedCompletion) < Number(value) ? '' : form.expectedCompletion,
                    })
                  }
                >
                  <SelectTrigger id="education-admission">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {ADMISSION_YEARS.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingField>
              <SettingField id="education-completion" label="Expected completion">
                <Select value={form.expectedCompletion} onValueChange={(value) => setForm({ ...form, expectedCompletion: value })}>
                  <SelectTrigger id="education-completion">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {completionYears.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingField>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save studies'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </form>
        </SettingsEditor>
      )}
    </SettingsGroup>
  );
}

const emptyEducationForm: EducationForm = {
  school: '',
  major: '',
  degreeType: '',
  yearOfAdmission: '',
  expectedCompletion: '',
};
