import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { ADMISSION_YEARS, DEGREE_TYPES, MAJORS } from '@/features/onboarding/constants';
import { SettingField, SettingsEditor, SettingsGroup, SettingsRow } from './SettingsScaffold';

interface Qualification {
  id: string;
  school: string | null;
  degree_type: string | null;
  major: string | null;
  year_of_admission: number | null;
  year_of_completion: number | null;
  is_current: boolean | null;
}

const qualificationSchema = z.object({
  school: z.string().trim().min(1, 'Enter the school name').max(200, 'Keep the school name under 200 characters'),
  degree_type: z.string().min(1, 'Choose a degree type'),
  major: z.string().min(1, 'Choose a major'),
});

const currentYear = new Date().getFullYear();
const COMPLETION_YEARS = Array.from({ length: 30 }, (_, index) => currentYear - 20 + index);

interface QualificationForm {
  school: string;
  degreeType: string;
  major: string;
  yearOfAdmission: string;
  yearOfCompletion: string;
  isCurrent: boolean;
}

const emptyForm: QualificationForm = {
  school: '',
  degreeType: '',
  major: '',
  yearOfAdmission: '',
  yearOfCompletion: '',
  isCurrent: false,
};

function describeQualification(qualification: Qualification): string {
  const programme = [qualification.degree_type, qualification.major]
    .filter(Boolean)
    .join(' in ')
    .replace('Bachelor of ', 'B. ')
    .replace('Master of ', 'M. ');
  return [
    programme || 'Qualification',
    qualification.school,
    qualification.year_of_admission
      ? `${qualification.year_of_admission} – ${qualification.is_current ? 'present' : (qualification.year_of_completion ?? '')}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Additional qualifications beyond the primary programme, in the `qualifications`
 * rows the app already owns: same table, same owner-scoped RLS, same columns the
 * qualification editor in the profile feature writes.
 */
export function QualificationsSection() {
  const { userId } = useAuth();
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<QualificationForm>(emptyForm);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('qualifications')
      .select('id, school, degree_type, major, year_of_admission, year_of_completion, is_current')
      .eq('user_id', userId)
      .order('year_of_admission', { ascending: false });

    if (error) {
      setLoadError(error.message);
    } else {
      setLoadError(null);
      setQualifications((data as Qualification[]) ?? []);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const startAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setFormError(null);
    setOpen(true);
  };

  const startEdit = (qualification: Qualification) => {
    setForm({
      school: qualification.school ?? '',
      degreeType: qualification.degree_type ?? '',
      major: qualification.major ?? '',
      yearOfAdmission: qualification.year_of_admission ? String(qualification.year_of_admission) : '',
      yearOfCompletion: qualification.year_of_completion ? String(qualification.year_of_completion) : '',
      isCurrent: qualification.is_current ?? false,
    });
    setEditingId(qualification.id);
    setFormError(null);
    setOpen(true);
  };

  const closeEditor = () => {
    setOpen(false);
    setEditingId(null);
    setFormError(null);
  };

  const save = async () => {
    if (!userId) return;
    const parsed = qualificationSchema.safeParse({
      school: form.school.trim(),
      degree_type: form.degreeType,
      major: form.major,
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Check the qualification details.');
      return;
    }

    const values = {
      school: form.school.trim(),
      degree_type: form.degreeType,
      major: form.major,
      year_of_admission: form.yearOfAdmission ? Number(form.yearOfAdmission) : null,
      year_of_completion: form.isCurrent ? null : form.yearOfCompletion ? Number(form.yearOfCompletion) : null,
      is_current: form.isCurrent,
    };

    setSaving(true);
    const result = editingId
      ? await supabase.from('qualifications').update(values).eq('id', editingId).eq('user_id', userId)
      : await supabase.from('qualifications').insert({ ...values, user_id: userId });
    setSaving(false);

    if (result.error) {
      setFormError(result.error.message || 'The qualification could not be saved.');
      return;
    }
    closeEditor();
    toast.success(editingId ? 'Qualification updated' : 'Qualification added');
    await load();
  };

  const remove = async (qualification: Qualification) => {
    if (!userId) return;
    const { error } = await supabase
      .from('qualifications')
      .delete()
      .eq('id', qualification.id)
      .eq('user_id', userId);
    if (error) {
      toast.error(error.message || 'The qualification could not be removed.');
      return;
    }
    if (editingId === qualification.id) closeEditor();
    toast.success('Qualification removed');
    await load();
  };

  return (
    <SettingsGroup
      title="Qualifications"
      description="Other programmes you have completed or are attending."
      action={
        !open && (
          <Button variant="outline" size="sm" onClick={startAdd}>
            <Plus className="size-3.5" aria-hidden="true" />
            Add
          </Button>
        )
      }
    >
      {loading ? (
        <p className="workspace-row type-supporting flex items-center gap-2" role="status">
          <Spinner className="size-3.5" />
          Loading qualifications…
        </p>
      ) : loadError ? (
        <div className="workspace-row flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Your qualifications could not be loaded.</p>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : qualifications.length === 0 ? (
        <p className="workspace-row type-supporting">
          No additional qualifications yet. Your current programme above is always included.
        </p>
      ) : (
        qualifications.map((qualification) => (
          <SettingsRow key={qualification.id} label={describeQualification(qualification)}>
            {qualification.is_current && (
              <Badge variant="soft-neutral" className="text-xs">
                Current
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={() => startEdit(qualification)}>
              <Pencil className="size-3.5" aria-hidden="true" />
              Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={`Remove ${describeQualification(qualification)}`}>
                  <Trash2 className="size-3.5 text-destructive" aria-hidden="true" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove this qualification?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {describeQualification(qualification)} will be removed from your profile. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => void remove(qualification)}
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </SettingsRow>
        ))
      )}

      {open && (
        <SettingsEditor>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            {formError && (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <SettingField id="qualification-school" label="School or university">
                <Input
                  id="qualification-school"
                  value={form.school}
                  maxLength={200}
                  autoComplete="organization"
                  onChange={(event) => setForm({ ...form, school: event.target.value })}
                />
              </SettingField>
              <SettingField id="qualification-major" label="Major">
                <Select value={form.major} onValueChange={(value) => setForm({ ...form, major: value })}>
                  <SelectTrigger id="qualification-major">
                    <SelectValue placeholder="Select major" />
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
              <SettingField id="qualification-degree" label="Degree type">
                <Select value={form.degreeType} onValueChange={(value) => setForm({ ...form, degreeType: value })}>
                  <SelectTrigger id="qualification-degree">
                    <SelectValue placeholder="Select degree" />
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
              <div className="grid grid-cols-2 gap-3">
                <SettingField id="qualification-admission" label="Year of admission">
                  <Select
                    value={form.yearOfAdmission}
                    onValueChange={(value) =>
                      setForm({
                        ...form,
                        yearOfAdmission: value,
                        yearOfCompletion:
                          form.yearOfCompletion && Number(form.yearOfCompletion) < Number(value) ? '' : form.yearOfCompletion,
                      })
                    }
                  >
                    <SelectTrigger id="qualification-admission">
                      <SelectValue placeholder="Year" />
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
                <SettingField
                  id="qualification-completion"
                  label="Completed"
                  hint={form.isCurrent ? 'Not while it is current' : undefined}
                >
                  <Select
                    value={form.yearOfCompletion}
                    disabled={form.isCurrent}
                    onValueChange={(value) => setForm({ ...form, yearOfCompletion: value })}
                  >
                    <SelectTrigger id="qualification-completion">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPLETION_YEARS.map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </SettingField>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="qualification-current"
                checked={form.isCurrent}
                onCheckedChange={(checked) => setForm({ ...form, isCurrent: checked === true })}
              />
              <Label htmlFor="qualification-current" className="text-sm font-normal">
                I am currently studying here
              </Label>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? <Spinner className="size-3.5" /> : null}
                {saving ? 'Saving…' : editingId ? 'Update qualification' : 'Add qualification'}
              </Button>
              <Button type="button" variant="ghost" onClick={closeEditor} disabled={saving}>
                Cancel
              </Button>
            </div>
          </form>
        </SettingsEditor>
      )}
    </SettingsGroup>
  );
}
