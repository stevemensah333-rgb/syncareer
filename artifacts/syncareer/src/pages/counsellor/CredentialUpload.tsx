import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CredentialUploadField } from '@/components/counsellor/CredentialUploadField';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { supabase } from '@/integrations/supabase/client';
import {
  uploadCredential,
  getCounsellorCredentials,
  Credential,
} from '@/lib/credentialApi';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import AnimatedSection from '@/components/landing/AnimatedSection';

interface CredentialState {
  degree?: Credential;
  license?: Credential;
  certification?: Credential;
  work_experience?: Credential;
}

interface FormData {
  degree: {
    file?: File;
    issuerName: string;
    issueDate: string;
    expiryDate: string;
  };
  license: {
    file?: File;
    issuerName: string;
    issueDate: string;
    expiryDate: string;
  };
  certification: {
    file?: File;
    issuerName: string;
    issueDate: string;
    expiryDate: string;
  };
  work_experience: {
    file?: File;
    issuerName: string;
    issueDate: string;
    expiryDate: string;
  };
}

export default function CredentialUpload() {
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [credentials, setCredentials] = useState<CredentialState>({});
  const [formData, setFormData] = useState<FormData>({
    degree: { issuerName: '', issueDate: '', expiryDate: '' },
    license: { issuerName: '', issueDate: '', expiryDate: '' },
    certification: { issuerName: '', issueDate: '', expiryDate: '' },
    work_experience: { issuerName: '', issueDate: '', expiryDate: '' },
  });

  // Fetch existing credentials
  useEffect(() => {
    if (profile?.id) {
      fetchCredentials();
    }
  }, [profile?.id]);

  const fetchCredentials = async () => {
    try {
      const creds = await getCounsellorCredentials(profile!.id);
      const credentialState: CredentialState = {};
      creds.forEach((cred) => {
        credentialState[cred.credential_type as keyof CredentialState] = cred;
      });
      setCredentials(credentialState);
    } catch (error) {
      console.error('Failed to fetch credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (type: keyof FormData, file: File) => {
    setFormData((prev) => ({
      ...prev,
      [type]: { ...prev[type], file },
    }));
  };

  const handleFileRemove = (type: keyof FormData) => {
    setFormData((prev) => ({
      ...prev,
      [type]: { ...prev[type], file: undefined },
    }));
  };

  const handleFieldChange = (
    type: keyof FormData,
    field: string,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }));
  };

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `credentials/${profile!.id}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (error) throw error;
    return data.path;
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      // Validate at least one credential is being submitted
      const hasAnyFile = Object.values(formData).some((f) => f.file);
      if (!hasAnyFile) {
        toast.error('Please upload at least one credential');
        return;
      }

      // Upload all selected credentials
      const uploadPromises: Promise<void>[] = [];

      for (const [type, data] of Object.entries(formData)) {
        if (data.file && data.issuerName && data.issueDate) {
          uploadPromises.push(
            (async () => {
              const documentUrl = await uploadFile(data.file!);

              await uploadCredential({
                counsellorId: profile!.id,
                type: type as any,
                documentName: data.file!.name,
                documentUrl,
                issuerName: data.issuerName,
                issueDate: data.issueDate,
                expiryDate: data.expiryDate || undefined,
              });
            })()
          );
        }
      }

      await Promise.all(uploadPromises);

      toast.success('Credentials submitted for verification!');
      await fetchCredentials();
      setFormData({
        degree: { issuerName: '', issueDate: '', expiryDate: '' },
        license: { issuerName: '', issueDate: '', expiryDate: '' },
        certification: { issuerName: '', issueDate: '', expiryDate: '' },
        work_experience: { issuerName: '', issueDate: '', expiryDate: '' },
      });
    } catch (error) {
      console.error('Failed to upload credentials:', error);
      toast.error('Failed to upload credentials. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="Complete Your Credentials">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PageLayout>
    );
  }

  const credentialTypes = [
    {
      key: 'degree' as const,
      label: 'Education/Degree',
      description: 'Upload your university degree or educational qualification',
    },
    {
      key: 'license' as const,
      label: 'Professional License',
      description: 'e.g., LMHC, LCPC, LCSW, or equivalent',
    },
    {
      key: 'certification' as const,
      label: 'Professional Certification',
      description: 'e.g., ICF, NBCC, or relevant coaching/counselling certification',
    },
    {
      key: 'work_experience' as const,
      label: 'Work Experience',
      description: 'Employment letter or documentation of relevant experience',
    },
  ];

  const approvedCount = Object.values(credentials).filter(
    (c) => c?.verification_status === 'approved'
  ).length;
  const pendingCount = Object.values(credentials).filter(
    (c) => c?.verification_status === 'pending'
  ).length;

  return (
    <PageLayout title="Complete Your Credentials">
      <div className="max-w-4xl mx-auto space-y-8">
        <AnimatedSection delay={0} y={20}>
          <Card>
            <CardHeader>
              <CardTitle>Verify Your Credentials</CardTitle>
              <CardDescription>
                Help students trust your expertise by verifying your credentials. We typically review within 24 hours.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Verification Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {approvedCount} approved, {pendingCount} pending
                  </span>
                </div>
                <Progress
                  value={(approvedCount / credentialTypes.length) * 100}
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>
        </AnimatedSection>

        {/* Status Summary */}
        {pendingCount > 0 && (
          <AnimatedSection delay={0.1} y={20}>
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <p className="text-sm text-blue-900">
                  ℹ️ You have {pendingCount} credential(s) pending review. We'll notify you once they're verified.
                </p>
              </CardContent>
            </Card>
          </AnimatedSection>
        )}

        {/* Credential Forms */}
        <div className="space-y-6">
          {credentialTypes.map((credType, index) => (
            <AnimatedSection key={credType.key} delay={0.2 + index * 0.05} y={20}>
              <CredentialUploadField
                credentialType={credType.key}
                label={credType.label}
                description={credType.description}
                file={formData[credType.key].file}
                documentUrl={credentials[credType.key]?.document_url}
                status={credentials[credType.key]?.verification_status}
                onFileSelect={(file) => handleFileSelect(credType.key, file)}
                onRemove={() => handleFileRemove(credType.key)}
                issuerName={formData[credType.key].issuerName}
                onIssuerChange={(name) =>
                  handleFieldChange(credType.key, 'issuerName', name)
                }
                issueDate={formData[credType.key].issueDate}
                onIssueDateChange={(date) =>
                  handleFieldChange(credType.key, 'issueDate', date)
                }
                expiryDate={formData[credType.key].expiryDate}
                onExpiryDateChange={(date) =>
                  handleFieldChange(credType.key, 'expiryDate', date)
                }
                disabled={submitting}
              />
            </AnimatedSection>
          ))}
        </div>

        {/* Submit Button */}
        <AnimatedSection delay={0.5} y={20}>
          <div className="flex gap-4">
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1"
              size="lg"
            >
              {submitting ? 'Uploading...' : 'Submit for Verification'}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/counsellor-dashboard')}
              disabled={submitting}
              size="lg"
            >
              Skip
            </Button>
          </div>
        </AnimatedSection>

        {/* Info Box */}
        <AnimatedSection delay={0.6} y={20}>
          <Card className="bg-muted">
            <CardContent className="pt-6">
              <h4 className="font-medium mb-2">What happens next?</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Your documents will be reviewed by our team</li>
                <li>• We verify the authenticity of your credentials</li>
                <li>• You'll receive an email once verification is complete</li>
                <li>• A "Verified" badge will appear on your profile</li>
              </ul>
            </CardContent>
          </Card>
        </AnimatedSection>
      </div>
    </PageLayout>
  );
}
