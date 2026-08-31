export const MENTORSHIP_REQUEST_TYPES = {
  resume_cv_review: 'Resume/CV review',
  portfolio_feedback: 'Portfolio feedback',
  career_path_conversation: 'Career path conversation',
  interview_preparation: 'Interview preparation',
  role_industry_insight: 'Role/industry insight',
} as const;

export type MentorshipRequestType = keyof typeof MENTORSHIP_REQUEST_TYPES;
export type MentorshipRequestStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'completed';
export type MentorAvailabilityStatus = 'accepting' | 'limited' | 'paused';
export type MentorVerificationStatus = 'pending' | 'approved' | 'rejected' | 'revoked';

export interface MentorProfile {
  mentor_id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  current_role: string | null;
  expertise_tags: string[];
  years_experience: number;
  availability_status: MentorAvailabilityStatus;
  company_name: string;
  email_domain: string;
  verified_at: string;
}

export interface MentorshipRequest {
  id: string;
  mentee_id: string;
  mentor_id: string;
  request_type: MentorshipRequestType;
  goal: string;
  context: string;
  deadline: string | null;
  supporting_url: string | null;
  job_application_id: string | null;
  resume_id: string | null;
  status: MentorshipRequestStatus;
  created_at: string;
  mentor_name: string;
  mentor_role: string | null;
  mentor_company: string | null;
  mentee_name: string | null;
  resume_title: string | null;
  application_title: string | null;
  application_company: string | null;
}

export interface MyMentorProfile {
  mentor_id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  current_role: string | null;
  expertise_tags: string[];
  years_experience: number;
  availability_status: MentorAvailabilityStatus;
  verification_id: string | null;
  verification_status: MentorVerificationStatus | null;
  claimed_organization: string | null;
  canonical_company_name: string | null;
  email_domain: string | null;
  submitted_at: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
}
