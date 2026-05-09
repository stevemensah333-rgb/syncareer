import React from 'react';
import { Upload, X, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface CredentialUploadFieldProps {
  credentialType: 'degree' | 'license' | 'certification' | 'work_experience';
  label: string;
  description: string;
  file?: File;
  documentUrl?: string;
  status?: 'pending' | 'approved' | 'rejected';
  onFileSelect: (file: File) => void;
  onRemove: () => void;
  issuerName?: string;
  onIssuerChange: (name: string) => void;
  issueDate?: string;
  onIssueDateChange: (date: string) => void;
  expiryDate?: string;
  onExpiryDateChange: (date: string) => void;
  disabled?: boolean;
}

export function CredentialUploadField({
  credentialType,
  label,
  description,
  file,
  documentUrl,
  status,
  onFileSelect,
  onRemove,
  issuerName,
  onIssuerChange,
  issueDate,
  onIssueDateChange,
  expiryDate,
  onExpiryDateChange,
  disabled,
}: CredentialUploadFieldProps) {
  const [isDragActive, setIsDragActive] = React.useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      onFileSelect(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>{label}</span>
          {getStatusIcon()}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload Area */}
        {!file && !documentUrl ? (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
          >
            <input
              type="file"
              onChange={handleFileChange}
              disabled={disabled}
              className="hidden"
              id={`file-input-${credentialType}`}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
            <label
              htmlFor={`file-input-${credentialType}`}
              className="cursor-pointer"
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Drag and drop your file here</p>
              <p className="text-xs text-muted-foreground">or click to browse</p>
              <p className="text-xs text-muted-foreground mt-2">
                Accepted: PDF, Word, JPG, PNG (max 10MB)
              </p>
            </label>
          </div>
        ) : (
          <div className="bg-muted rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">
                  {file?.name || (documentUrl?.split('/').pop() || 'Document')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {file?.size ? `${(file.size / 1024).toFixed(2)} KB` : 'Uploaded'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Issuer Name */}
        <div>
          <Label htmlFor={`issuer-${credentialType}`} className="text-sm">
            Issuing Organization
          </Label>
          <Input
            id={`issuer-${credentialType}`}
            placeholder="e.g., University of California, State Board of Licensing"
            value={issuerName || ''}
            onChange={(e) => onIssuerChange(e.target.value)}
            disabled={disabled}
            className="mt-1"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor={`issue-${credentialType}`} className="text-sm">
              Issue Date
            </Label>
            <Input
              id={`issue-${credentialType}`}
              type="date"
              value={issueDate || ''}
              onChange={(e) => onIssueDateChange(e.target.value)}
              disabled={disabled}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor={`expiry-${credentialType}`} className="text-sm">
              Expiry Date (Optional)
            </Label>
            <Input
              id={`expiry-${credentialType}`}
              type="date"
              value={expiryDate || ''}
              onChange={(e) => onExpiryDateChange(e.target.value)}
              disabled={disabled}
              className="mt-1"
            />
          </div>
        </div>

        {/* Status Message */}
        {status === 'pending' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <p className="text-sm text-yellow-800">
              ⏳ Your credential is pending review. We typically review within 24 hours.
            </p>
          </div>
        )}
        {status === 'approved' && (
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <p className="text-sm text-green-800">
              ✓ Your credential has been verified and approved.
            </p>
          </div>
        )}
        {status === 'rejected' && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-sm text-red-800">
              ✗ Your credential was not approved. Please resubmit with updated information.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
