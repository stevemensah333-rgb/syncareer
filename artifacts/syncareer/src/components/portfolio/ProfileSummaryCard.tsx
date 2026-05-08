import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, School, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface StudentDetail {
  major: string;
  school: string | null;
  degree_type: string;
  year_of_admission: number | null;
  expected_completion: number | null;
}

interface Qualification {
  id: string;
  major: string;
  school: string;
  degree_type: string;
  year_of_admission: number | null;
  year_of_completion: number | null;
  is_current: boolean | null;
}

interface ProfileInfo {
  full_name: string | null;
  user_type: string | null;
  bio: string | null;
}

const ProfileSummaryCard = () => {
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) { setLoading(false); return; }

        const userId = session.user.id;

        const [profileRes, studentRes, qualRes] = await Promise.all([
          supabase.from('profiles').select('full_name, user_type, bio').eq('id', userId).maybeSingle(),
          supabase.from('student_details').select('*').eq('user_id', userId).maybeSingle(),
          supabase.from('qualifications').select('*').eq('user_id', userId).order('year_of_admission', { ascending: false }),
        ]);

        if (profileRes.data) setProfile(profileRes.data as ProfileInfo);
        if (studentRes.data) setStudentDetail(studentRes.data as StudentDetail);
        if (qualRes.data) setQualifications(qualRes.data as Qualification[]);
      } catch (error) {
        console.error('Error fetching profile summary:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Only show for students
  if (!profile || profile.user_type !== 'student') return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          Education Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary Education from student_details */}
        {studentDetail && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Primary Education</p>
            <div className="flex items-start gap-2">
              <School className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">{studentDetail.degree_type} in {studentDetail.major}</p>
                {studentDetail.school && (
                  <p className="text-sm text-muted-foreground">{studentDetail.school}</p>
                )}
                {(studentDetail.year_of_admission || studentDetail.expected_completion) && (
                  <p className="text-xs text-muted-foreground">
                    {studentDetail.year_of_admission && `${studentDetail.year_of_admission}`}
                    {studentDetail.year_of_admission && studentDetail.expected_completion && ' – '}
                    {studentDetail.expected_completion && `${studentDetail.expected_completion}`}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Additional Qualifications */}
        {qualifications.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Additional Qualifications</p>
            {qualifications.map((q) => (
              <div key={q.id} className="flex items-start gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{q.degree_type} in {q.major}</p>
                  <p className="text-sm text-muted-foreground">{q.school}</p>
                  {(q.year_of_admission || q.year_of_completion) && (
                    <p className="text-xs text-muted-foreground">
                      {q.year_of_admission && `${q.year_of_admission}`}
                      {q.year_of_admission && (q.year_of_completion || q.is_current) && ' – '}
                      {q.is_current ? 'Present' : q.year_of_completion && `${q.year_of_completion}`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!studentDetail && qualifications.length === 0 && (
          <p className="text-sm text-muted-foreground">No education details added yet.</p>
        )}

        {profile.bio && (
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Bio</p>
            <p className="text-sm text-muted-foreground line-clamp-3">{profile.bio}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfileSummaryCard;
