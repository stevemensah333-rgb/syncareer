import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { initialCVData } from '@/features/cv-builder/types';
import { CVPreviewDialog } from './CVPreviewDialog';

describe('CVPreviewDialog accessibility', () => {
  it('provides a labelled modal preview that closes through Escape and an explicit control', () => {
    const onOpenChange = vi.fn();
    const onDownload = vi.fn();
    render(
      <CVPreviewDialog
        open
        data={initialCVData}
        isGeneratingPDF={false}
        onOpenChange={onOpenChange}
        onDownload={onDownload}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'CV preview' });
    expect(dialog.hasAttribute('aria-describedby')).toBe(true);
    expect(screen.getByText('Review your CV before downloading it as a PDF.')).toBeTruthy();

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);

    fireEvent.click(screen.getByRole('button', { name: 'Close preview' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });
});
