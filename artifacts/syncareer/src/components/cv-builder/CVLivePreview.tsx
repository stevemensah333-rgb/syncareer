import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CVPreview } from '@/components/cv-builder/CVPreview';
import type { CVData } from '@/features/cv-builder/types';

const PAGE_WIDTH_PX = 794; // A4 at 96dpi

interface CVLivePreviewProps {
  data: CVData;
  /** Section currently being edited; the page scrolls to and highlights it. */
  activeSection: string;
  /** Toolbar content shown in the preview header, e.g. the score chip. */
  headerRight?: React.ReactNode;
}

/**
 * The document as it will print, sitting beside the form and following the
 * section being edited. Scaled to whatever width the column offers so the
 * whole page stays readable without horizontal scrolling.
 */
export function CVLivePreview({ data, activeSection, headerRight }: CVLivePreviewProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const [scaledHeight, setScaledHeight] = useState(0);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width > 0) setScale(Math.min(1, width / PAGE_WIDTH_PX));
    });

    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const page = pageRef.current;
    if (page) setScaledHeight(page.scrollHeight * scale);
  }, [scale, data]);

  useEffect(() => {
    const page = pageRef.current;
    const scroller = scrollRef.current;
    if (!page || !scroller) return;

    page.querySelectorAll('[data-cv-active]').forEach((node) => node.removeAttribute('data-cv-active'));
    const target = page.querySelector<HTMLElement>(`[data-cv-section="${activeSection}"]`);
    if (!target) return;
    target.setAttribute('data-cv-active', 'true');
    scroller.scrollTo({
      top: Math.max(0, target.offsetTop * scale - 16),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }, [activeSection, scale, data]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-surface border border-border bg-card shadow-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <p className="type-label text-primary">Live preview</p>
        {headerRight}
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto bg-secondary/40 p-3">
        <div ref={frameRef} className="mx-auto w-full" style={{ height: scaledHeight || undefined }}>
          <div
            ref={pageRef}
            className="cv-live-page origin-top-left shadow-card"
            style={{ width: PAGE_WIDTH_PX, transform: `scale(${scale})` }}
          >
            <CVPreview data={data} />
          </div>
        </div>
      </div>
    </div>
  );
}
