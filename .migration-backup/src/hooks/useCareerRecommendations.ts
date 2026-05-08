import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RIASEC_LABELS } from '@/data/assessmentQuestions';
import type { AssessmentResult } from '@/hooks/useAssessment';

export interface Career {
  id: string;
  title: string;
  description: string;
  riasec_profile: Record<string, number>;
  suggested_majors: string[];
  required_skills: string[];
  salary_range: string | null;
  industry: string;
}

export interface CareerRecommendation {
  career: Career;
  matchScore: number;
  explanation: string;
}

const INTEREST_WEIGHTS = { primary: 0.5, secondary: 0.3, tertiary: 0.2 };

const RIASEC_STRENGTHS: Record<string, string> = {
  R: 'hands-on strengths',
  I: 'analytical mindset',
  A: 'creativity',
  S: 'people skills',
  E: 'leadership',
  C: 'organizational abilities',
};

function reverseLabel(label: string): string | null {
  return Object.entries(RIASEC_LABELS).find(([, v]) => v === label)?.[0] || null;
}

function generateExplanation(
  career: Career,
  primaryKey: string | null,
  secondaryKey: string | null,
  tertiaryKey: string | null,
): string {
  const parts: string[] = [];
  const profile = career.riasec_profile;

  [primaryKey, secondaryKey, tertiaryKey].forEach((key) => {
    if (key && profile[key] >= 0.4) {
      parts.push(`${RIASEC_LABELS[key]} ${RIASEC_STRENGTHS[key] || 'traits'}`);
    }
  });

  if (parts.length === 0) return `This career aligns with your overall interest profile.`;
  if (parts.length === 1) return `This career matches your ${parts[0]}.`;
  const last = parts.pop();
  return `This career matches your ${parts.join(', ')}, and ${last}.`;
}

function getClusterInsight(
  primaryKey: string | null,
  secondaryKey: string | null,
  tertiaryKey: string | null,
): { title: string; themes: string[] } | null {
  const keys = [primaryKey, secondaryKey, tertiaryKey].filter(Boolean).sort().join('');

  const clusters: Record<string, { title: string; themes: string[] }> = {
    AER: { title: 'Creative Entrepreneurship', themes: ['Design & innovation', 'Creative entrepreneurship', 'Hands-on leadership careers'] },
    AEI: { title: 'Innovative Strategy', themes: ['Tech-driven creativity', 'Strategic innovation', 'Research-backed design'] },
    AES: { title: 'Creative Leadership', themes: ['People-centered design', 'Arts leadership', 'Social innovation'] },
    AIR: { title: 'Technical Innovation', themes: ['R&D and engineering', 'Applied creativity', 'Invention & prototyping'] },
    AIS: { title: 'Humanistic Discovery', themes: ['Research with purpose', 'Creative problem solving', 'Social science & arts'] },
    EIR: { title: 'Technical Leadership', themes: ['Engineering management', 'Tech strategy', 'Innovation leadership'] },
    ERS: { title: 'Operational Leadership', themes: ['Team management', 'Service leadership', 'Practical problem solving'] },
    CIR: { title: 'Systematic Engineering', themes: ['Precision engineering', 'Quality systems', 'Data-driven processes'] },
    CEI: { title: 'Strategic Analytics', themes: ['Business intelligence', 'Financial strategy', 'Management consulting'] },
    CES: { title: 'Service Operations', themes: ['Healthcare administration', 'HR management', 'Organizational services'] },
  };

  return clusters[keys] || null;
}

export function useCareerRecommendations(assessmentResult: AssessmentResult | null) {
  const [careers, setCareers] = useState<Career[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCareers() {
      const { data, error } = await supabase
        .from('careers')
        .select('*');

      if (!error && data) {
        setCareers(data.map(d => ({
          ...d,
          riasec_profile: d.riasec_profile as Record<string, number>,
          suggested_majors: d.suggested_majors || [],
          required_skills: d.required_skills || [],
        })));
      }
      setLoading(false);
    }
    fetchCareers();
  }, []);

  const recommendations = useMemo<CareerRecommendation[]>(() => {
    if (!assessmentResult || careers.length === 0) return [];

    const primaryKey = reverseLabel(assessmentResult.primary_interest || '');
    const secondaryKey = reverseLabel(assessmentResult.secondary_interest || '');
    const tertiaryKey = reverseLabel(assessmentResult.tertiary_interest || '');
    const workScores = assessmentResult.work_interest_score_json;

    // Build user weighted profile
    const userProfile: Record<string, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };

    if (primaryKey && workScores[primaryKey] !== undefined) {
      userProfile[primaryKey] += (workScores[primaryKey] / 100) * INTEREST_WEIGHTS.primary;
    }
    if (secondaryKey && workScores[secondaryKey] !== undefined) {
      userProfile[secondaryKey] += (workScores[secondaryKey] / 100) * INTEREST_WEIGHTS.secondary;
    }
    if (tertiaryKey && workScores[tertiaryKey] !== undefined) {
      userProfile[tertiaryKey] += (workScores[tertiaryKey] / 100) * INTEREST_WEIGHTS.tertiary;
    }

    // Score each career
    const scored = careers.map((career) => {
      const cp = career.riasec_profile;
      let dotProduct = 0;
      let userMag = 0;
      let careerMag = 0;

      Object.keys(userProfile).forEach((key) => {
        const u = userProfile[key] || 0;
        const c = cp[key] || 0;
        dotProduct += u * c;
        userMag += u * u;
        careerMag += c * c;
      });

      const magnitude = Math.sqrt(userMag) * Math.sqrt(careerMag);
      const cosineSimilarity = magnitude > 0 ? dotProduct / magnitude : 0;
      const matchScore = Math.round(cosineSimilarity * 100);

      return {
        career,
        matchScore: Math.min(matchScore, 99),
        explanation: generateExplanation(career, primaryKey, secondaryKey, tertiaryKey),
      };
    });

    return scored.sort((a, b) => b.matchScore - a.matchScore).slice(0, 10);
  }, [assessmentResult, careers]);

  const clusterInsight = useMemo(() => {
    if (!assessmentResult) return null;
    const pk = reverseLabel(assessmentResult.primary_interest || '');
    const sk = reverseLabel(assessmentResult.secondary_interest || '');
    const tk = reverseLabel(assessmentResult.tertiary_interest || '');
    return getClusterInsight(pk, sk, tk);
  }, [assessmentResult]);

  return { recommendations, clusterInsight, loading };
}
