import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Credential } from '@/lib/credentialApi';
import { format } from 'date-fns';
import { Eye } from 'lucide-react';

interface CredentialListProps {
  credentials: Credential[];
  loading: boolean;
  onViewCredential: (credential: Credential) => void;
}

const credentialTypeLabel = {
  degree: 'Education/Degree',
  license: 'Professional License',
  certification: 'Professional Certification',
  work_experience: 'Work Experience',
};

const statusColors = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'destructive',
} as const;

export function CredentialList({
  credentials,
  loading,
  onViewCredential,
}: CredentialListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (credentials.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>No credentials to review</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted">
            <TableHead>Counsellor</TableHead>
            <TableHead>Credential Type</TableHead>
            <TableHead>Issuer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {credentials.map((credential) => (
            <TableRow key={credential.id} className="hover:bg-muted/50">
              <TableCell>
                <div>
                  <p className="font-medium">
                    {credential.counsellor?.first_name} {credential.counsellor?.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {credential.counsellor?.email}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                {credentialTypeLabel[credential.credential_type as keyof typeof credentialTypeLabel]}
              </TableCell>
              <TableCell>{credential.issuer_name}</TableCell>
              <TableCell>
                <Badge variant={statusColors[credential.verification_status] as 'secondary' | 'default' | 'destructive'}>
                  {credential.verification_status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(credential.created_at), 'MMM d, yyyy')}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewCredential(credential)}
                  className="gap-1"
                >
                  <Eye className="h-4 w-4" />
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
