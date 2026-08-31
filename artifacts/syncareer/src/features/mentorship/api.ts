import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { MentorProfile, MentorshipRequest, MyMentorProfile } from './types';

type RpcResult = { data: unknown; error: PostgrestError | null };
type RpcCall = (name: string, args?: Record<string, unknown>) => PromiseLike<RpcResult>;
const rpc = supabase.rpc as unknown as RpcCall;

async function call<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await rpc(name, args);
  if (error) throw error;
  return data as T;
}

export const mentorshipApi = {
  listMentors: () => call<MentorProfile[]>('list_mentor_profiles'),
  myRequests: () => call<MentorshipRequest[]>('get_my_mentorship_requests'),
  myMentorProfile: () => call<MyMentorProfile | null>('get_my_mentor_profile'),
  requestContext: (requestId: string) => call<Record<string, unknown>>('get_mentorship_request_context', { p_request_id: requestId }),
  createRequest: (input: { mentorId: string; requestType: string; goal: string; context: string; deadline?: string; supportingUrl?: string; applicationId?: string; resumeId?: string }) => call('create_mentorship_request', {
    p_mentor_id: input.mentorId, p_request_type: input.requestType, p_goal: input.goal,
    p_context: input.context, p_deadline: input.deadline || null,
    p_supporting_url: input.supportingUrl || null, p_job_application_id: input.applicationId || null,
    p_resume_id: input.resumeId || null,
  }),
  respond: (requestId: string, decision: 'accepted' | 'declined') => call('respond_to_mentorship_request', { p_request_id: requestId, p_decision: decision }),
  updateStatus: (requestId: string, action: 'withdraw' | 'complete') => call('update_mentorship_request_status', { p_request_id: requestId, p_action: action }),
  updateProfile: (input: { fullName: string; currentRole: string; bio: string; expertiseTags: string[]; yearsExperience: number; availabilityStatus: string }) => call('update_my_mentor_profile', {
    p_full_name: input.fullName, p_current_role: input.currentRole, p_bio: input.bio,
    p_expertise_tags: input.expertiseTags, p_years_experience: input.yearsExperience,
    p_availability_status: input.availabilityStatus,
  }),
  submitVerification: (organization: string) => call('submit_mentor_verification', { p_claimed_organization: organization }),
  adminVerifications: () => call<AdminMentorVerification[]>('get_admin_mentor_verifications'),
  decideVerification: (id: string, decision: 'approved' | 'rejected' | 'revoked', company?: string, reason?: string) => call('admin_mentor_verification', {
    p_verification_id: id, p_decision: decision, p_company_name: company || null, p_rejection_reason: reason || null,
  }),
};

export interface AdminMentorVerification extends MyMentorProfile {
  id: string;
  mentor_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
  organization_email: string;
  claimed_organization: string;
  submitted_at: string;
}
