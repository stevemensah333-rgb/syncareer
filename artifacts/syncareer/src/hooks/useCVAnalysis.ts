import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CVData } from '@/features/cv-builder/types';
import { MAX_UPLOAD_FILE_SIZE, ALLOWED_UPLOAD_TYPES } from '@/features/cv-builder/constants';
import { z } from 'zod';

export type AnalysisStatus = 'idle' | 'uploading' | 'analyzing' | 'done' | 'error';

const boundedText = z.string().max(10_000);
const shortText = z.string().max(500);
const analysisResultSchema = z.object({
  analysis: boundedText,
  extractedSkills: z.array(z.object({ name: shortText, category: shortText, proficiency: shortText })).max(100),
  experienceSummary: z.object({
    totalYears: z.number().finite().nonnegative(),
    industries: z.array(shortText).max(50),
    educationLevel: shortText,
    keyAchievements: z.array(boundedText).max(100),
  }).nullable(),
  scores: z.object({
    overall: z.number().finite().min(0).max(100),
    formatting: z.number().finite().min(0).max(100),
    content: z.number().finite().min(0).max(100),
    relevance: z.number().finite().min(0).max(100),
    impact: z.number().finite().min(0).max(100),
  }).nullable(),
  suggestedRoles: z.array(shortText).max(50),
  missingSkills: z.array(shortText).max(100),
  extractedPersonal: z.object({
    firstName: shortText, lastName: shortText, email: shortText, phone: shortText,
    linkedIn: shortText, nationality: shortText,
  }).nullable(),
  extractedEducation: z.object({
    university: shortText, degree: shortText, location: shortText,
    graduationDate: shortText, gpa: shortText,
  }).nullable(),
  extractedExperience: z.array(z.object({
    company: shortText, role: shortText, location: shortText, date: shortText,
    bullets: z.array(boundedText).max(100),
  })).max(100),
}).strict();

export type AnalysisResult = z.infer<typeof analysisResultSchema>;

export function parseCVAnalysisResult(value: unknown): AnalysisResult | null {
  const parsed = analysisResultSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip "data:...;base64," prefix
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export const useCVAnalysis = () => {
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeFile = useCallback(async (file: File) => {
    setError(null);

    if (!(ALLOWED_UPLOAD_TYPES as readonly string[]).includes(file.type)) {
      const msg = 'Only PDF and DOCX files are supported.';
      setError(msg);
      toast.error(msg);
      return;
    }
    if (file.size > MAX_UPLOAD_FILE_SIZE) {
      const msg = 'File is too large. Max size is 5 MB.';
      setError(msg);
      toast.error(msg);
      return;
    }

    try {
      setStatus('uploading');
      const fileBase64 = await fileToBase64(file);

      setStatus('analyzing');
      const { data, error: fnError } = await supabase.functions.invoke('analyze-portfolio', {
        body: {
          fileBase64,
          fileMimeType: file.type,
          fileName: file.name,
        },
      });

      if (fnError) throw fnError;
      const parsed = parseCVAnalysisResult(data);
      if (!parsed) throw new Error('MALFORMED_ANALYSIS_RESPONSE');

      setResult(parsed);
      setStatus('done');
      toast.success('CV analyzed — review and edit each section.');
    } catch (cause: unknown) {
      console.error('[useCVAnalysis] CV analysis failed', { name: cause instanceof Error ? cause.name : 'UnknownError' });
      const msg = cause instanceof Error && cause.message === 'MALFORMED_ANALYSIS_RESPONSE'
        ? 'The CV analysis service returned an unsupported response. Nothing was applied.'
        : 'Failed to analyze CV. Nothing was applied.';
      setError(msg);
      setStatus('error');
      toast.error(msg);
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  /**
   * Merge analysis into CV state. Only fills empty fields, preserves user input.
   */
  const applyToCVData = useCallback((setCVData: React.Dispatch<React.SetStateAction<CVData>>) => {
    if (!result) return;

    setCVData(prev => {
      const next: CVData = { ...prev };

      // Personal — only fill empty fields
      if (result.extractedPersonal) {
        const p = result.extractedPersonal;
        next.personal = {
          ...prev.personal,
          firstName: prev.personal.firstName || p.firstName || '',
          lastName: prev.personal.lastName || p.lastName || '',
          email: prev.personal.email || p.email || '',
          phone: prev.personal.phone || p.phone || '',
          linkedIn: prev.personal.linkedIn || p.linkedIn || '',
          nationality: prev.personal.nationality || p.nationality || '',
          schoolEmail: prev.personal.schoolEmail,
        };
      }

      // Education
      if (result.extractedEducation) {
        const e = result.extractedEducation;
        next.education = {
          university: prev.education.university || e.university || '',
          degree: prev.education.degree || e.degree || '',
          location: prev.education.location || e.location || '',
          graduationDate: prev.education.graduationDate || e.graduationDate || '',
          gpa: prev.education.gpa || e.gpa || '',
        };
      }

      // Experience — append only when no entries yet
      if (prev.experience.length === 0 && result.extractedExperience.length > 0) {
        next.experience = result.extractedExperience.map((x, i) => ({
          id: `ai-${Date.now()}-${i}`,
          company: x.company || '',
          role: x.role || '',
          location: x.location || '',
          date: x.date || '',
          bullets: Array.isArray(x.bullets) ? x.bullets : [],
        }));
      }

      // Skills — dedupe (case-insensitive)
      if (result.extractedSkills.length > 0) {
        const existingLower = new Set(prev.skills.map(s => s.toLowerCase()));
        const newSkills = result.extractedSkills
          .map(s => s.name?.trim())
          .filter(Boolean)
          .filter(s => !existingLower.has(s.toLowerCase()));
        next.skills = [...prev.skills, ...newSkills];
      }

      return next;
    });
  }, [result]);

  return { status, result, error, analyzeFile, reset, applyToCVData };
};
