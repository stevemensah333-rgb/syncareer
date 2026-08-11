import { Download } from 'lucide-react';
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
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-4xl overflow-y-auto p-0 [&>button]:hidden">
        <DialogHeader className="sticky top-0 z-10 flex-col items-start gap-3 border-b bg-card p-4 text-left sm:flex-row sm:items-center sm:justify-between">
          <div>
            <DialogTitle asChild>
              <p className="font-semibold">CV preview</p>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Review your CV before downloading it as a PDF.
            </DialogDescription>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-nowrap">
            <Button className="flex-1 sm:flex-none" onClick={onDownload} disabled={isGeneratingPDF}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
            <Button className="flex-1 sm:flex-none" variant="outline" onClick={() => onOpenChange(false)}>
              Close preview
            </Button>
          </div>
        </DialogHeader>
        <div className="p-4">
          <CVPreview data={data} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
