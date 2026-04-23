import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CVData } from '@/pages/CVBuilder';

export type AnalysisStatus = 'idle' | 'uploading' | 'analyzing' | 'done' | 'error';

export interface ExtractedSkill {
  name: string;
  category: string;
  proficiency: string;
}

export interface ExtractedPersonal {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  linkedIn: string;
  nationality: string;
}

export interface ExtractedEducation {
  university: string;
  degree: string;
  location: string;
  graduationDate: string;
  gpa: string;
}

export interface ExtractedExperience {
  company: string;
  role: string;
  location: string;
  date: string;
  bullets: string[];
}

export interface AnalysisResult {
  analysis: string;
  extractedSkills: ExtractedSkill[];
  experienceSummary: {
    totalYears: number;
    industries: string[];
    educationLevel: string;
    keyAchievements: string[];
  } | null;
  scores: {
    overall: number;
    formatting: number;
    content: number;
    relevance: number;
    impact: number;
  } | null;
  suggestedRoles: string[];
  missingSkills: string[];
  extractedPersonal: ExtractedPersonal | null;
  extractedEducation: ExtractedEducation | null;
  extractedExperience: ExtractedExperience[];
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

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

    if (!ALLOWED_TYPES.includes(file.type)) {
      const msg = 'Only PDF and DOCX files are supported.';
      setError(msg);
      toast.error(msg);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
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
      if (!data) throw new Error('No data returned from analysis');

      setResult(data as AnalysisResult);
      setStatus('done');
      toast.success('CV analyzed — review and edit each section.');
    } catch (e: any) {
      console.error('[useCVAnalysis] Error:', e);
      const msg = e?.message || 'Failed to analyze CV.';
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
