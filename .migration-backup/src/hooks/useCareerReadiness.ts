import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCareerSkills, getCareerFramework } from '@/utils/careerSkillFramework';

export interface SkillReadiness {
  skillName: string;
  mastery: number; // 0-100
  proficiency: string;
  gap: number; // 100 - mastery
}

export interface PillarScore {
  name: string;
  score: number; // 0-100
  weight: number; // decimal
  weightedScore: number;
  description: string;
}

export interface CourseProgress {
  id: string;
  skill_name: string;
  course_title: string;
  course_url: string | null;
  status: string;
  validated_at: string | null;
}

export interface ReadinessData {
  overallScore: number;
  level: string;
  pillars: PillarScore[];
  skillGaps: SkillReadiness[];
  radarData: { axis: string; value: number }[];
  savedCourses: CourseProgress[];
  portfolioCount: number;
  cvScore: number;
  interviewScore: number;
  loading: boolean;
}

const proficiencyToPercent: Record<string, number> = {
  beginner: 25,
  intermediate: 50,
  advanced: 75,
  expert: 100,
};

const getLevel = (score: number): string => {
  if (score >= 76) return 'Career Ready';
  if (score >= 51) return 'Proficient';
  if (score >= 26) return 'Developing';
  return 'Beginning';
};

const computeCVScore = (resume: any): number => {
  if (!resume) return 0;
  let score = 0;
  const pi = resume.personal_info as any;
  if (pi?.fullName || pi?.full_name) score += 15;
  if (pi?.email) score += 10;
  if (pi?.phone) score += 5;
  const edu = resume.education;
  if (Array.isArray(edu) && edu.length > 0) score += 20;
  const exp = resume.experience;
  if (Array.isArray(exp) && exp.length > 0) score += 20;
  const skills = resume.skills;
  if (Array.isArray(skills) && skills.length > 0) score += 15;
  const projects = resume.projects;
  if (Array.isArray(projects) && projects.length > 0) score += 15;
  return Math.min(100, score);
};

export const useCareerReadiness = (major: string | null | undefined) => {
  const [data, setData] = useState<ReadinessData>({
    overallScore: 0,
    level: 'Beginning',
    pillars: [],
    skillGaps: [],
    radarData: [],
    savedCourses: [],
    portfolioCount: 0,
    cvScore: 0,
    interviewScore: 0,
    loading: true,
  });

  const fetchReadiness = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !major) {
        setData(prev => ({ ...prev, loading: false }));
        return;
      }

      const userId = session.user.id;
      const careerSkills = getCareerSkills(major);

      // Fetch all data in parallel
      const [skillsRes, portfolioRes, resumeRes, interviewsRes, coursesRes] = await Promise.all([
        supabase.from('user_skills').select('skill_name, proficiency').eq('user_id', userId),
        supabase.from('portfolio_projects').select('id').eq('user_id', userId),
        supabase.from('resumes').select('personal_info, education, experience, skills, projects').eq('user_id', userId).eq('is_primary', true).maybeSingle(),
        supabase.from('mock_interviews').select('overall_score').eq('user_id', userId).not('overall_score', 'is', null),
        supabase.from('user_course_progress').select('*').eq('user_id', userId).eq('career_path', major),
      ]);

      const userSkills = skillsRes.data || [];
      const portfolioCount = portfolioRes.data?.length || 0;
      const resume = resumeRes.data;
      const interviews = interviewsRes.data || [];
      const courses = (coursesRes.data || []) as CourseProgress[];

      // === Technical Skills (50%) ===
      const skillGaps: SkillReadiness[] = careerSkills.map(skill => {
        const userSkill = userSkills.find((s: any) => s.skill_name === skill);
        const mastery = userSkill ? (proficiencyToPercent[userSkill.proficiency] || 0) : 0;
        return {
          skillName: skill,
          mastery,
          proficiency: userSkill?.proficiency || 'none',
          gap: 100 - mastery,
        };
      });

      const technicalScore = careerSkills.length > 0
        ? skillGaps.reduce((sum, s) => sum + s.mastery, 0) / careerSkills.length
        : 0;

      // === Practical Application (30%) ===
      const practicalScore = Math.min(100, portfolioCount * 25);

      // === Professional Readiness (20%) ===
      const cvScore = computeCVScore(resume);
      const avgInterview = interviews.length > 0
        ? interviews.reduce((sum: number, i: any) => sum + (i.overall_score || 0), 0) / interviews.length
        : 0;
      const professionalScore = interviews.length > 0
        ? (cvScore + avgInterview) / 2
        : cvScore;

      // === Pillars ===
      const pillars: PillarScore[] = [
        {
          name: 'Technical Skills',
          score: Math.round(technicalScore),
          weight: 0.5,
          weightedScore: Math.round(technicalScore * 0.5),
          description: 'Core knowledge and domain expertise',
        },
        {
          name: 'Practical Application',
          score: Math.round(practicalScore),
          weight: 0.3,
          weightedScore: Math.round(practicalScore * 0.3),
          description: 'Projects, portfolio, real-world application',
        },
        {
          name: 'Professional Readiness',
          score: Math.round(professionalScore),
          weight: 0.2,
          weightedScore: Math.round(professionalScore * 0.2),
          description: 'CV strength, interview skills, communication',
        },
      ];

      const overallScore = pillars.reduce((sum, p) => sum + p.weightedScore, 0);

      // === Radar data (4 axes) ===
      const radarData = [
        { axis: 'Technical', value: Math.round(technicalScore) },
        { axis: 'Projects', value: Math.round(practicalScore) },
        { axis: 'Interview', value: Math.round(avgInterview) },
        { axis: 'CV & Communication', value: Math.round(cvScore) },
      ];

      setData({
        overallScore: Math.round(overallScore),
        level: getLevel(overallScore),
        pillars,
        skillGaps: skillGaps.sort((a, b) => a.mastery - b.mastery), // worst gaps first
        radarData,
        savedCourses: courses,
        portfolioCount,
        cvScore: Math.round(cvScore),
        interviewScore: Math.round(avgInterview),
        loading: false,
      });
    } catch (error) {
      console.error('Error computing readiness:', error);
      setData(prev => ({ ...prev, loading: false }));
    }
  }, [major]);

  useEffect(() => { fetchReadiness(); }, [fetchReadiness]);

  return { ...data, refetch: fetchReadiness };
};
