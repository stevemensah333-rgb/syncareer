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
      setSelectedName(null);
      onReset();
    }
    onOpenChange(next);
  };

  const isBusy = status === 'uploading' || status === 'analyzing';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-overlay shadow-overlay">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Upload existing CV</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            With your explicit selection, the file is sent to Syncareer's AI analysis service to extract suggested fields. Nothing is applied until you review and choose “Apply to CV”. PDF or DOCX, max 5 MB.
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
            className={`rounded-surface border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/30'
            }`}
          >
            <Upload className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground mb-1">Click to upload or drag a file</p>
            <p className="text-xs text-muted-foreground">PDF, DOCX, DOC — up to 5 MB</p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            {error && (
              <div className="mt-4 flex items-center justify-center gap-2 rounded-surface bg-destructive/10 p-2 text-xs font-medium text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}
          </div>
        ) : isBusy ? (
          <div className="py-10 text-center space-y-3">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">
              {status === 'uploading' ? 'Reading your file…' : 'Analyzing your CV…'}
            </p>
            {selectedName && (
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                {selectedName}
              </p>
            )}
          </div>
        ) : (
          <div className="py-6 text-center space-y-4">
            <CheckCircle2 className="mx-auto h-8 w-8 text-success" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-foreground">Analysis complete</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Apply the extracted info to your CV — your existing entries won't be overwritten.
              </p>
            </div>
            <div className="flex justify-center gap-2">
              <Button variant="outline" className="rounded-control" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button
                className="rounded-control"
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
