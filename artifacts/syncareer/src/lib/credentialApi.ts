import { supabase } from '@/integrations/supabase/client';
import { } from 'sonner';

export interface Credential {
  id: string;
  counsellor_id: string;
  credential_type: 'degree' | 'license' | 'certification' | 'work_experience';
  document_url: string;
  document_name: string;
  issue_date: string;
  expiry_date: string | null;
  issuer_name: string;
  verification_status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  counsellor?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    bio: string;
    specialization: string;
    avatar_url: string;
  };
}

export interface CredentialUploadRequest {
  counsellorId: string;
  type: 'degree' | 'license' | 'certification' | 'work_experience';
  documentName: string;
  documentUrl: string;
  issuerName: string;
  issueDate: string;
  expiryDate?: string;
}

export interface CredentialApprovalRequest {
  credentialId: string;
  notes?: string;
}

export interface CredentialRejectionRequest {
  credentialId: string;
  notes: string;
}

// Get all credentials for a counsellor
export async function getCounsellorCredentials(counsellorId: string) {
  try {
    const { data, error } = await supabase
      .from('counsellor_credentials')
      .select('*')
      .eq('counsellor_id', counsellorId);

    if (error) throw error;
    return data as Credential[];
  } catch (error) {
    console.error('[credentialApi] Failed to fetch counsellor credentials:', error);
    throw error;
  }
}

// Get credential verification status
export async function getCounsellorVerificationStatus(counsellorId: string) {
  try {
    const { data, error } = await supabase
      .from('counsellor_credentials')
      .select('verification_status, credential_type')
      .eq('counsellor_id', counsellorId);

    if (error) throw error;

    const credentials = data as Pick<Credential, 'verification_status' | 'credential_type'>[];
    
    // Check if all credentials are approved
    const allApproved = credentials.length > 0 && 
      credentials.every(c => c.verification_status === 'approved');
    
    return {
      isVerified: allApproved,
      credentials: credentials,
      allApproved,
      pendingCount: credentials.filter(c => c.verification_status === 'pending').length,
      rejectedCount: credentials.filter(c => c.verification_status === 'rejected').length,
    };
  } catch (error) {
    console.error('[credentialApi] Failed to get verification status:', error);
    throw error;
  }
}

// Upload a credential
export async function uploadCredential(request: CredentialUploadRequest) {
  try {
    const { data, error } = await supabase
      .from('counsellor_credentials')
      .insert({
        counsellor_id: request.counsellorId,
        credential_type: request.type,
        document_url: request.documentUrl,
        document_name: request.documentName,
        issuer_name: request.issuerName,
        issue_date: request.issueDate,
        expiry_date: request.expiryDate || null,
        verification_status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data as Credential;
  } catch (error) {
    console.error('[credentialApi] Failed to upload credential:', error);
    throw error;
  }
}

// Get all credentials for admin review (with counsellor info)
export async function getAdminCredentials(filters?: {
  status?: 'pending' | 'approved' | 'rejected';
  type?: 'degree' | 'license' | 'certification' | 'work_experience';
  counsellorId?: string;
}) {
  try {
    let query = supabase
      .from('counsellor_credentials')
      .select(`
        *,
        counsellor:counsellor_details!counsellor_id(
          id,
          first_name,
          last_name,
          email,
          bio,
          specialization,
          avatar_url
        )
      `);

    if (filters?.status) {
      query = query.eq('verification_status', filters.status);
    }
    if (filters?.type) {
      query = query.eq('credential_type', filters.type);
    }
    if (filters?.counsellorId) {
      query = query.eq('counsellor_id', filters.counsellorId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data as Credential[];
  } catch (error) {
    console.error('[credentialApi] Failed to fetch admin credentials:', error);
    throw error;
  }
}

// Approve a credential
export async function approveCredential(request: CredentialApprovalRequest, adminId: string) {
  try {
    const { data, error } = await supabase
      .from('counsellor_credentials')
      .update({
        verification_status: 'approved',
        notes: request.notes || null,
        verified_by: adminId,
        verified_at: new Date().toISOString(),
      })
      .eq('id', request.credentialId)
      .select()
      .single();

    if (error) throw error;
    return data as Credential;
  } catch (error) {
    console.error('[credentialApi] Failed to approve credential:', error);
    throw error;
  }
}

// Reject a credential
export async function rejectCredential(request: CredentialRejectionRequest, adminId: string) {
  try {
    const { data, error } = await supabase
      .from('counsellor_credentials')
      .update({
        verification_status: 'rejected',
        notes: request.notes,
        verified_by: adminId,
        verified_at: new Date().toISOString(),
      })
      .eq('id', request.credentialId)
      .select()
      .single();

    if (error) throw error;
    return data as Credential;
  } catch (error) {
    console.error('[credentialApi] Failed to reject credential:', error);
    throw error;
  }
}

// Delete a credential
export async function deleteCredential(credentialId: string) {
  try {
    const { error } = await supabase
      .from('counsellor_credentials')
      .delete()
      .eq('id', credentialId);

    if (error) throw error;
  } catch (error) {
    console.error('[credentialApi] Failed to delete credential:', error);
    throw error;
  }
}
