import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { } from '@/components/ui/badge';
import { CredentialList } from '@/components/admin/CredentialList';
import { CredentialViewer } from '@/components/admin/CredentialViewer';
import { getAdminCredentials, Credential } from '@/lib/credentialApi';
import { toast } from 'sonner';
import { FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import AnimatedSection from '@/components/landing/AnimatedSection';

export default function CredentialReview() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'degree' | 'license' | 'certification' | 'work_experience'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCredentials();
  }, [statusFilter, typeFilter]);

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      const data = await getAdminCredentials({
        status: statusFilter === 'all' ? undefined : statusFilter,
        type: typeFilter === 'all' ? undefined : (typeFilter as any),
      });
      setCredentials(data);
    } catch (error) {
      console.error('Failed to fetch credentials:', error);
      toast.error('Failed to load credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleViewCredential = (credential: Credential) => {
    setSelectedCredential(credential);
    setViewerOpen(true);
  };

  const handleApproveReject = () => {
    setViewerOpen(false);
    fetchCredentials();
  };

  // Filter credentials based on search
  const filteredCredentials = credentials.filter((cred) => {
    const searchStr = searchQuery.toLowerCase();
    return (
      cred.counsellor?.first_name?.toLowerCase().includes(searchStr) ||
      cred.counsellor?.last_name?.toLowerCase().includes(searchStr) ||
      cred.counsellor?.email?.toLowerCase().includes(searchStr)
    );
  });

  // Statistics
  const stats = {
    pending: credentials.filter((c) => c.verification_status === 'pending').length,
    approved: credentials.filter((c) => c.verification_status === 'approved').length,
    rejected: credentials.filter((c) => c.verification_status === 'rejected').length,
    total: credentials.length,
  };

  return (
    <AdminLayout title="Credential Review">
      <div className="space-y-8">
        {/* Header */}
        <AnimatedSection delay={0} y={20}>
          <div>
            <h1 className="text-3xl font-bold">Counsellor Credential Review</h1>
            <p className="text-muted-foreground mt-2">
              Review and verify counsellor credentials to ensure platform quality
            </p>
          </div>
        </AnimatedSection>

        {/* Statistics */}
        <AnimatedSection delay={0.1} y={20}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Approved</p>
                    <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Rejected</p>
                    <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </AnimatedSection>

        {/* Filters and Search */}
        <AnimatedSection delay={0.2} y={20}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Search</label>
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select
                    value={statusFilter}
                    onValueChange={(value: any) => setStatusFilter(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Type</label>
                  <Select
                    value={typeFilter}
                    onValueChange={(value: any) => setTypeFilter(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="degree">Education/Degree</SelectItem>
                      <SelectItem value="license">Professional License</SelectItem>
                      <SelectItem value="certification">Professional Certification</SelectItem>
                      <SelectItem value="work_experience">Work Experience</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </AnimatedSection>

        {/* Credentials Table */}
        <AnimatedSection delay={0.3} y={20}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Credentials ({filteredCredentials.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CredentialList
                credentials={filteredCredentials}
                loading={loading}
                onViewCredential={handleViewCredential}
              />
            </CardContent>
          </Card>
        </AnimatedSection>

        {/* Credential Viewer Modal */}
        {selectedCredential && (
          <CredentialViewer
            credential={selectedCredential}
            open={viewerOpen}
            onOpenChange={setViewerOpen}
            onApproveReject={handleApproveReject}
          />
        )}
      </div>
    </AdminLayout>
  );
}
