import React, { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { AnalysisStatus } from '@/hooks/useCVAnalysis';

interface CVUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: AnalysisStatus;
  error: string | null;
  onAnalyze: (file: File) => void;
  onApply: () => void;
  onReset: () => void;
}

export const CVUploadDialog: React.FC<CVUploadDialogProps> = ({
  open,
  onOpenChange,
  status,
  error,
  onAnalyze,
  onApply,
  onReset,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const handleFile = (file: File | null) => {
    if (!file) return;
    setSelectedName(file.name);
    onAnalyze(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0] ?? null);
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      // reset on close
      setSelectedName(null);
      onReset();
    }
    onOpenChange(next);
  };

  const isBusy = status === 'uploading' || status === 'analyzing';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload existing CV</DialogTitle>
          <DialogDescription>
            We'll extract your details and pre-fill the form. PDF or DOCX, max 5 MB.
          </DialogDescription>
        </DialogHeader>

        {status === 'idle' || status === 'error' ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">Click to upload or drag a file</p>
            <p className="text-xs text-muted-foreground">PDF, DOCX, DOC — up to 5 MB</p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            {error && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
          </div>
        ) : isBusy ? (
          <div className="py-10 text-center">
            <Loader2 className="h-10 w-10 mx-auto mb-3 animate-spin text-primary" />
            <p className="text-sm font-medium">
              {status === 'uploading' ? 'Reading your file…' : 'Analyzing your CV…'}
            </p>
            {selectedName && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1.5">
                <FileText className="h-3 w-3" />
                {selectedName}
              </p>
            )}
          </div>
        ) : (
          <div className="py-6 text-center space-y-4">
            <CheckCircle2 className="h-10 w-10 mx-auto text-primary" />
            <div>
              <p className="text-sm font-medium">Analysis complete</p>
              <p className="text-xs text-muted-foreground mt-1">
                Apply the extracted info to your CV — your existing entries won't be overwritten.
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onApply();
                  onOpenChange(false);
                }}
              >
                Apply to CV
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CVUploadDialog;
