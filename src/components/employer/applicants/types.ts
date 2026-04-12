export interface ApplicantProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface Application {
  id: string;
  job_id: string;
  applicant_id: string;
  status: string;
  cover_letter: string | null;
  resume_url: string | null;
  notes: string | null;
  created_at: string;
  job?: {
    title: string;
    location: string;
    department: string | null;
  };
  applicant?: ApplicantProfile;
}

export interface Interview {
  id: string;
  application_id: string;
  scheduled_at: string;
  duration_minutes: number;
  interview_type: string;
  meeting_link: string | null;
  status: string;
  notes: string | null;
}

export const PIPELINE_STAGES = [
  { id: 'pending', label: 'Applied' },
  { id: 'reviewing', label: 'Reviewing' },
  { id: 'interview', label: 'Interview' },
  { id: 'offered', label: 'Offered' },
  { id: 'rejected', label: 'Rejected' },
] as const;
