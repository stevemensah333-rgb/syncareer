import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CVPreview } from '@/components/cv-builder/CVPreview';
import type { CVData } from '@/features/cv-builder/types';

interface CVPreviewDialogProps {
  open: boolean;
  data: CVData;
  isGeneratingPDF: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: () => void;
}

/**
 * The on-screen CV preview is a modal document view, not a decorative overlay.
 * Using the shared Radix dialog gives it a labelled modal landmark, focus trap,
 * Escape close behaviour, and focus restoration to the Preview control.
 */
export function CVPreviewDialog({
  open,
  data,
  isGeneratingPDF,
  onOpenChange,
  onDownload,
}: CVPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-4xl overflow-y-auto rounded-overlay p-0 shadow-overlay [&>button]:hidden">
        <DialogHeader className="sticky top-0 z-10 flex-col items-start gap-3 border-b border-border bg-card/95 p-4 backdrop-blur-sm text-left sm:flex-row sm:items-center sm:justify-between">
          <div>
            <DialogTitle asChild>
              <h2 className="text-base font-semibold text-foreground">CV preview</h2>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Review your CV before downloading it as a PDF.
            </DialogDescription>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-nowrap">
            <Button className="flex-1 rounded-control sm:flex-none" onClick={onDownload} disabled={isGeneratingPDF}>
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              {isGeneratingPDF ? 'Preparing PDF…' : 'Download PDF'}
            </Button>
            <Button className="flex-1 rounded-control sm:flex-none" variant="outline" onClick={() => onOpenChange(false)}>
              <X className="mr-1.5 h-4 w-4 sm:hidden" aria-hidden="true" />
              Close preview
            </Button>
          </div>
        </DialogHeader>
        <div className="p-4 sm:p-6 bg-muted/30">
          <div className="mx-auto max-w-[210mm] shadow-card">
            <CVPreview data={data} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
