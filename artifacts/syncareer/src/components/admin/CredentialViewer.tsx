import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Credential, approveCredential, rejectCredential } from '@/lib/credentialApi';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseUserId } from '@/hooks/useSupabaseUserId';
import { format } from 'date-fns';

interface CredentialViewerProps {
  credential: Credential;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApproveReject: () => void;
}

export function CredentialViewer({
  credential,
  open,
  onOpenChange,
  onApproveReject,
}: CredentialViewerProps) {
  const adminId = useSupabaseUserId();
  const [approveNotes, setApproveNotes] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'document'>('profile');

  const handleApprove = async () => {
    try {
      setApproving(true);
      await approveCredential(
        { credentialId: credential.id, notes: approveNotes },
        adminId!
      );
      toast.success('Credential approved!');
      setApproveNotes('');
      onOpenChange(false);
      onApproveReject();
    } catch (error) {
      toast.error('Failed to approve credential');
      console.error(error);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectNotes.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      setRejecting(true);
      await rejectCredential(
        { credentialId: credential.id, notes: rejectNotes },
        adminId!
      );
      toast.success('Credential rejected');
      setRejectNotes('');
      onOpenChange(false);
      onApproveReject();
    } catch (error) {
      toast.error('Failed to reject credential');
      console.error(error);
    } finally {
      setRejecting(false);
    }
  };

  const downloadDocument = async () => {
    try {
      const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(credential.document_url);
      
      window.open(data.publicUrl, '_blank');
    } catch (error) {
      toast.error('Failed to download document');
    }
  };

  const credentialTypeLabel = {
    degree: 'Education/Degree',
    license: 'Professional License',
    certification: 'Professional Certification',
    work_experience: 'Work Experience',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Credential Review -{' '}
            {credential.counsellor?.first_name} {credential.counsellor?.last_name}
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 font-medium text-sm border-b-2 ${
              activeTab === 'profile'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('document')}
            className={`px-4 py-2 font-medium text-sm border-b-2 ${
              activeTab === 'document'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground'
            }`}
          >
            Document
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Counsellor Info */}
            <div>
              <h3 className="font-semibold mb-4">Counsellor Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">
                    {credential.counsellor?.first_name} {credential.counsellor?.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{credential.counsellor?.email}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Specialization</p>
                  <p className="font-medium">{credential.counsellor?.specialization}</p>
                </div>
                {credential.counsellor?.bio && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Bio</p>
                    <p className="text-sm">{credential.counsellor.bio}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Credential Info */}
            <div>
              <h3 className="font-semibold mb-4">Credential Details</h3>
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded">
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">
                    {credentialTypeLabel[credential.credential_type as keyof typeof credentialTypeLabel]}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={credential.verification_status === 'approved' ? 'default' : credential.verification_status === 'pending' ? 'secondary' : 'destructive'}>
                    {credential.verification_status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Issuer</p>
                  <p className="font-medium">{credential.issuer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Issue Date</p>
                  <p className="font-medium">
                    {credential.issue_date ? format(new Date(credential.issue_date), 'MMM d, yyyy') : 'N/A'}
                  </p>
                </div>
                {credential.expiry_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Expiry Date</p>
                    <p className="font-medium">
                      {format(new Date(credential.expiry_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="font-medium">
                    {format(new Date(credential.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Form */}
            {credential.verification_status === 'pending' && (
              <div className="space-y-4 border-t pt-4">
                <div>
                  <label className="text-sm font-medium">Approval Notes (Optional)</label>
                  <Textarea
                    placeholder="Add notes for approval..."
                    value={approveNotes}
                    onChange={(e) => setApproveNotes(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Rejection Reason (if rejecting)</label>
                  <Textarea
                    placeholder="Explain why this credential is being rejected..."
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleApprove}
                    disabled={approving || rejecting}
                    className="gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    onClick={handleReject}
                    variant="destructive"
                    disabled={approving || rejecting}
                    className="gap-2"
                  >
                    <AlertCircle className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Document Tab */}
        {activeTab === 'document' && (
          <div className="space-y-4">
            <div className="bg-muted p-8 rounded text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Document: {credential.document_name}
              </p>
              <Button onClick={downloadDocument} className="gap-2">
                <Download className="h-4 w-4" />
                Download Document
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                Click the button above to view/download the credential document
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
