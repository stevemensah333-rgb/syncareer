import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { GraduationCap, Briefcase, Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import { z } from 'zod';

// Validation schema for qualifications
const qualificationSchema = z.object({
  school: z.string().trim().min(1, 'School name is required').max(200, 'School name must be less than 200 characters'),
  degree_type: z.string().min(1, 'Degree type is required'),
  major: z.string().min(1, 'Major is required'),
});

interface Qualification {
  id: string;
  school: string;
  degree_type: string;
  major: string;
  year_of_admission: number | null;
  year_of_completion: number | null;
  is_current: boolean;
}

const MAJORS = [
  'Computer Science', 'Business Administration', 'Law', 'Electrical Engineering',
  'Mechanical Engineering', 'Civil Engineering', 'Chemical Engineering',
  'Information Technology', 'Data Science', 'Finance', 'Accounting', 'Marketing',
  'Human Resources', 'Economics', 'Psychology', 'Medicine', 'Nursing', 'Pharmacy',
  'Architecture', 'Graphic Design', 'Communications', 'Education',
  'Environmental Science', 'Agriculture', 'Other',
];

const DEGREE_TYPES = [
  'Certificate', 'Diploma', 'Associate Degree', "Bachelor's Degree",
  'Honours Degree', 'Postgraduate Diploma', "Master's Degree",
  'Doctoral Degree (PhD)', 'Professional Degree',
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 30 }, (_, i) => currentYear - 20 + i);

export function ProfileSection() {
  const { profile, studentDetails, employerDetails, refreshProfile } = useUserProfile();
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state for new/edit qualification
  const [formData, setFormData] = useState({
    school: '',
    degree_type: '',
    major: '',
    year_of_admission: '',
    year_of_completion: '',
    is_current: false,
  });

  useEffect(() => {
    fetchQualifications();
  }, []);

  const fetchQualifications = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('qualifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('year_of_admission', { ascending: false });

      if (error) throw error;
      setQualifications((data as Qualification[]) || []);
    } catch (error) {
      console.error('Error fetching qualifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      school: '',
      degree_type: '',
      major: '',
      year_of_admission: '',
      year_of_completion: '',
      is_current: false,
    });
    setShowAddForm(false);
    setEditingId(null);
  };

  const handleAddQualification = async () => {
    const result = qualificationSchema.safeParse({
      school: formData.school.trim(),
      degree_type: formData.degree_type,
      major: formData.major,
    });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.from('qualifications').insert({
        user_id: session.user.id,
        school: formData.school,
        degree_type: formData.degree_type,
        major: formData.major,
        year_of_admission: formData.year_of_admission ? parseInt(formData.year_of_admission) : null,
        year_of_completion: formData.year_of_completion ? parseInt(formData.year_of_completion) : null,
        is_current: formData.is_current,
      });

      if (error) throw error;
      toast.success('Qualification added');
      resetForm();
      fetchQualifications();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add qualification');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateQualification = async () => {
    if (!editingId) return;
    
    const result = qualificationSchema.safeParse({
      school: formData.school.trim(),
      degree_type: formData.degree_type,
      major: formData.major,
    });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('qualifications')
        .update({
          school: formData.school,
          degree_type: formData.degree_type,
          major: formData.major,
          year_of_admission: formData.year_of_admission ? parseInt(formData.year_of_admission) : null,
          year_of_completion: formData.year_of_completion ? parseInt(formData.year_of_completion) : null,
          is_current: formData.is_current,
        })
        .eq('id', editingId);

      if (error) throw error;
      toast.success('Qualification updated');
      resetForm();
      fetchQualifications();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update qualification');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQualification = async (id: string) => {
    try {
      const { error } = await supabase.from('qualifications').delete().eq('id', id);
      if (error) throw error;
      toast.success('Qualification removed');
      fetchQualifications();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete qualification');
    }
  };

  const startEdit = (qual: Qualification) => {
    setFormData({
      school: qual.school,
      degree_type: qual.degree_type,
      major: qual.major,
      year_of_admission: qual.year_of_admission?.toString() || '',
      year_of_completion: qual.year_of_completion?.toString() || '',
      is_current: qual.is_current,
    });
    setEditingId(qual.id);
    setShowAddForm(true);
  };

  const getUserTypeLabel = () => {
    switch (profile?.user_type) {
      case 'student': return 'Student';
      case 'employer': return 'Employer';
      case 'career_counsellor': return 'Career Counsellor';
      default: return 'User';
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Profile Information</h2>

      {/* Status Badge */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Status:</span>
        <Badge variant="secondary" className="flex items-center gap-1">
          {profile?.user_type === 'student' ? (
            <GraduationCap className="h-3 w-3" />
          ) : (
            <Briefcase className="h-3 w-3" />
          )}
          {getUserTypeLabel()}
        </Badge>
      </div>

      {/* Current Primary Details */}
      {profile?.user_type === 'student' && studentDetails && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Primary Education
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Major:</span>
                <p className="font-medium">{studentDetails.major}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Degree:</span>
                <p className="font-medium">{studentDetails.degree_type}</p>
              </div>
              {studentDetails.school && (
                <div>
                  <span className="text-muted-foreground">School:</span>
                  <p className="font-medium">{studentDetails.school}</p>
                </div>
              )}
              {studentDetails.year_of_admission && (
                <div>
                  <span className="text-muted-foreground">Year of Admission:</span>
                  <p className="font-medium">{studentDetails.year_of_admission}</p>
                </div>
              )}
              {studentDetails.expected_completion && (
                <div>
                  <span className="text-muted-foreground">Expected Completion:</span>
                  <p className="font-medium">{studentDetails.expected_completion}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {profile?.user_type !== 'student' && employerDetails && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Company Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Company:</span>
                <p className="font-medium">{employerDetails.company_name}</p>
              </div>
              {employerDetails.job_title && (
                <div>
                  <span className="text-muted-foreground">Job Title:</span>
                  <p className="font-medium">{employerDetails.job_title}</p>
                </div>
              )}
              {employerDetails.industry && (
                <div>
                  <span className="text-muted-foreground">Industry:</span>
                  <p className="font-medium">{employerDetails.industry}</p>
                </div>
              )}
              {employerDetails.company_location && (
                <div>
                  <span className="text-muted-foreground">Location:</span>
                  <p className="font-medium">{employerDetails.company_location}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Qualifications */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Additional Qualifications</h3>
          {!showAddForm && (
            <Button size="sm" onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Qualification
            </Button>
          )}
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <Card className="mb-4">
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>School / University *</Label>
                  <Input
                    value={formData.school}
                    onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                    placeholder="Enter school name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Major / Field of Study *</Label>
                  <Select value={formData.major} onValueChange={(v) => setFormData({ ...formData, major: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select major" />
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
                  <Select value={formData.degree_type} onValueChange={(v) => setFormData({ ...formData, degree_type: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select degree" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      {DEGREE_TYPES.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Year of Admission</Label>
                  <Select value={formData.year_of_admission} onValueChange={(v) => setFormData({ ...formData, year_of_admission: v })}>
                    <SelectTrigger>
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
                  <Label>Year of Completion</Label>
                  <Select value={formData.year_of_completion} onValueChange={(v) => setFormData({ ...formData, year_of_completion: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      {years.map((y) => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="is_current"
                    checked={formData.is_current}
                    onChange={(e) => setFormData({ ...formData, is_current: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="is_current">Currently studying here</Label>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={editingId ? handleUpdateQualification : handleAddQualification}
                  disabled={saving}
                >
                  <Check className="h-4 w-4 mr-1" />
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Add'}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* List of qualifications */}
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading qualifications...</p>
        ) : qualifications.length === 0 ? (
          <p className="text-muted-foreground text-sm">No additional qualifications added yet.</p>
        ) : (
          <div className="space-y-3">
            {qualifications.map((qual) => (
              <Card key={qual.id}>
                <CardContent className="py-4 flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">{qual.degree_type} in {qual.major}</p>
                    <p className="text-sm text-muted-foreground">{qual.school}</p>
                    {(qual.year_of_admission || qual.year_of_completion) && (
                      <p className="text-xs text-muted-foreground">
                        {qual.year_of_admission} - {qual.is_current ? 'Present' : qual.year_of_completion}
                      </p>
                    )}
                    {qual.is_current && (
                      <Badge variant="outline" className="text-xs">Current</Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(qual)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteQualification(qual.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
