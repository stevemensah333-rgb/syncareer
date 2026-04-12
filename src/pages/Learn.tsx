import React, { useState, useEffect, useCallback } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, CheckCircle, BookOpen } from 'lucide-react';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { getCareerSkills } from '@/utils/careerSkillFramework';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ModuleQuizDialog, { type QuizQuestion } from '@/components/learn/ModuleQuizDialog';
import ReadinessOverview from '@/components/learn/ReadinessOverview';
import ReadinessRadar from '@/components/learn/ReadinessRadar';
import PillarCards from '@/components/learn/PillarCards';
import SkillGapCard, { type SkillCourse } from '@/components/learn/SkillGapCard';
import SavedCoursesSection from '@/components/learn/SavedCoursesSection';
import { useCareerReadiness, type CourseProgress } from '@/hooks/useCareerReadiness';

interface LearningStreak {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  total_learning_days: number;
}

const COOLDOWN_MINUTES = 5;

/** Generate course recommendations for a skill */
const getCoursesForSkill = (skillName: string, careerPath: string): SkillCourse[] => {
  const q = encodeURIComponent(`${skillName} ${careerPath}`);
  return [
    {
      title: `${skillName} Fundamentals`,
      provider: 'Coursera',
      url: `https://www.coursera.org/search?query=${q}`,
      difficulty: 'Beginner',
      estimatedImpact: 20,
      duration: '4 weeks',
    },
    {
      title: `${skillName} in Practice`,
      provider: 'Udemy',
      url: `https://www.udemy.com/courses/search/?q=${q}`,
      difficulty: 'Intermediate',
      estimatedImpact: 15,
      duration: '6 weeks',
    },
    {
      title: `Advanced ${skillName}`,
      provider: 'edX',
      url: `https://www.edx.org/search?q=${q}`,
      difficulty: 'Advanced',
      estimatedImpact: 10,
      duration: '8 weeks',
    },
  ];
};

const Learn = () => {
  const { studentDetails, loading } = useUserProfile();
  const major = studentDetails?.major || null;
  const readiness = useCareerReadiness(major);

  const [streak, setStreak] = useState<LearningStreak | null>(null);
  const [streakLoading, setStreakLoading] = useState(true);
  const [hasLoggedToday, setHasLoggedToday] = useState(false);

  // Quiz / validation state
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const [activeCourse, setActiveCourse] = useState<SkillCourse | null>(null);
  const [lastValidation, setLastValidation] = useState<number>(0);

  // Auto-log activity on page visit
  const autoLogActivity = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const today = new Date().toISOString().split('T')[0];
      const { data: existing } = await supabase
        .from('learning_activities')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('activity_date', today)
        .limit(1);
      if (existing && existing.length > 0) {
        setHasLoggedToday(true);
        return;
      }
      await supabase.from('learning_activities').insert({
        user_id: session.user.id, activity_type: 'page_visit', duration_minutes: 1,
      });
      setHasLoggedToday(true);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { autoLogActivity(); }, [autoLogActivity]);

  // Fetch streak
  useEffect(() => {
    const fetchStreak = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        const { data } = await supabase
          .from('learning_streaks')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        if (data) setStreak(data);
      } catch (e) { console.error(e); }
      finally { setStreakLoading(false); }
    };
    fetchStreak();
  }, [hasLoggedToday]);

  // === Course actions ===
  const handleSaveCourse = async (course: SkillCourse, skillName: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !major) return;
      const { error } = await supabase.from('user_course_progress').upsert({
        user_id: session.user.id,
        skill_name: skillName,
        career_path: major,
        course_title: course.title,
        course_url: course.url,
        status: 'saved',
      }, { onConflict: 'user_id,course_title,skill_name' });
      if (error) throw error;
      toast.success('Course saved');
      readiness.refetch();
    } catch (e) {
      console.error(e);
      toast.error('Failed to save course');
    }
  };

  const handleUnsaveCourse = async (courseTitle: string, skillName: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { error } = await supabase
        .from('user_course_progress')
        .delete()
        .eq('user_id', session.user.id)
        .eq('course_title', courseTitle)
        .eq('skill_name', skillName);
      if (error) throw error;
      toast.success('Course removed');
      readiness.refetch();
    } catch (e) {
      console.error(e);
      toast.error('Failed to remove course');
    }
  };

  const handleValidateCourse = async (course: SkillCourse, skillName: string) => {
    // Cooldown check
    if (Date.now() - lastValidation < COOLDOWN_MINUTES * 60 * 1000) {
      const remaining = Math.ceil((COOLDOWN_MINUTES * 60 * 1000 - (Date.now() - lastValidation)) / 60000);
      toast.error(`Please wait ${remaining} min before another validation.`);
      return;
    }

    setActiveSkill(skillName);
    setActiveCourse(course);
    setQuizOpen(true);
    setQuizLoading(true);
    setQuizQuestions([]);

    try {
      const { data, error } = await supabase.functions.invoke('generate-module-quiz', {
        body: {
          pathTitle: `${major} Career Readiness`,
          moduleNumber: 1,
          totalModules: 1,
          major,
          skillName,
          difficulty: course.difficulty === 'Beginner' ? 'foundational' : course.difficulty === 'Intermediate' ? 'developing' : 'advanced',
        },
      });
      if (error) throw error;
      if (data?.questions) setQuizQuestions(data.questions);
      else throw new Error('No questions returned');
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate validation quiz.');
      setQuizOpen(false);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleValidateSavedCourse = (courseProgress: CourseProgress) => {
    const course: SkillCourse = {
      title: courseProgress.course_title,
      provider: '',
      url: courseProgress.course_url || '',
      difficulty: 'Intermediate',
      estimatedImpact: 15,
      duration: '',
    };
    handleValidateCourse(course, courseProgress.skill_name);
  };

  const handleQuizPass = async (score: number) => {
    if (!activeSkill || !major) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Update skill mastery
      const currentSkill = readiness.skillGaps.find(s => s.skillName === activeSkill);
      const currentMastery = currentSkill?.mastery || 0;
      const newMastery = Math.min(100, currentMastery + (activeCourse?.estimatedImpact || 15));
      const proficiency = newMastery >= 100 ? 'expert' : newMastery >= 75 ? 'advanced' : newMastery >= 50 ? 'intermediate' : 'beginner';

      const { data: existing } = await supabase
        .from('user_skills')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('skill_name', activeSkill)
        .eq('source', 'mastery_path')
        .maybeSingle();

      if (existing) {
        await supabase.from('user_skills').update({ proficiency }).eq('id', existing.id);
      } else {
        await supabase.from('user_skills').insert({
          user_id: session.user.id,
          skill_name: activeSkill,
          category: major,
          proficiency,
          source: 'mastery_path',
        });
      }

      // Mark course as completed
      if (activeCourse) {
        await supabase.from('user_course_progress').upsert({
          user_id: session.user.id,
          skill_name: activeSkill,
          career_path: major,
          course_title: activeCourse.title,
          course_url: activeCourse.url,
          status: 'completed',
          validated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,course_title,skill_name' });
      }

      // Log activity
      await supabase.from('learning_activities').insert({
        user_id: session.user.id, activity_type: 'skill_validation', duration_minutes: 10,
      });

      setLastValidation(Date.now());
      toast.success(`${activeSkill} mastery updated to ${proficiency}.`);
      readiness.refetch();
    } catch (e) {
      console.error(e);
      toast.error('Failed to update skill mastery.');
    }
  };

  const handleQuizRetry = () => {
    if (activeSkill && activeCourse) {
      handleValidateCourse(activeCourse, activeSkill);
    }
  };

  if (loading || readiness.loading) {
    return (
      <PageLayout title="Career Readiness">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Analyzing your career readiness...</p>
        </div>
      </PageLayout>
    );
  }

  if (!major) {
    return (
      <PageLayout title="Career Readiness">
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold mb-1">Set Your Career Path</h3>
            <p className="text-sm text-muted-foreground">
              Complete your profile with your major and field of study to unlock personalized career readiness tracking.
            </p>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  const careerSkills = getCareerSkills(major);
  const hasSkills = careerSkills.length > 0;

  return (
    <PageLayout title="Career Readiness">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Readiness Overview */}
          <ReadinessOverview
            score={readiness.overallScore}
            level={readiness.level}
            careerPath={`${major} Career Path`}
          />

          {/* Pillars */}
          <PillarCards pillars={readiness.pillars} />

          {/* Skill Gaps */}
          {hasSkills && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Skill Gaps & Resources
              </h3>
              {readiness.skillGaps.map((skill) => (
                <SkillGapCard
                  key={skill.skillName}
                  skill={skill}
                  courses={getCoursesForSkill(skill.skillName, major)}
                  savedCourses={readiness.savedCourses}
                  onSaveCourse={(course) => handleSaveCourse(course, skill.skillName)}
                  onUnsaveCourse={(courseTitle) => handleUnsaveCourse(courseTitle, skill.skillName)}
                  onValidateCourse={(course) => handleValidateCourse(course, skill.skillName)}
                  validating={quizLoading}
                />
              ))}
            </div>
          )}

          {/* Saved Courses */}
          <SavedCoursesSection
            courses={readiness.savedCourses}
            onValidateCourse={handleValidateSavedCourse}
            onUnsaveCourse={handleUnsaveCourse}
            validating={quizLoading}
          />

          {!hasSkills && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground text-sm">
                  Skill framework for {major} is being developed. Check back soon.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Radar Chart */}
          <ReadinessRadar data={readiness.radarData} />

          {/* Learning Streak */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Flame className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Learning Streak</p>
                    <p className="text-2xl font-bold">
                      {streakLoading ? '...' : `${streak?.current_streak || 0} days`}
                    </p>
                  </div>
                </div>
                {hasLoggedToday && (
                  <div className="flex items-center gap-1 text-primary text-sm">
                    <CheckCircle className="h-4 w-4" />
                    <span>Today</span>
                  </div>
                )}
              </div>
              {streak?.longest_streak && streak.longest_streak > 0 && (
                <div className="mt-3 pt-3 border-t flex justify-between text-sm">
                  <span className="text-muted-foreground">Best streak</span>
                  <span className="font-medium">{streak.longest_streak} days</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Portfolio Projects</span>
                <span className="font-medium">{readiness.portfolioCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">CV Strength</span>
                <span className="font-medium">{readiness.cvScore}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Interview Score</span>
                <span className="font-medium">{readiness.interviewScore}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Courses Validated</span>
                <span className="font-medium">
                  {readiness.savedCourses.filter(c => c.status === 'completed').length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Validation Quiz Dialog */}
      <ModuleQuizDialog
        open={quizOpen}
        onOpenChange={setQuizOpen}
        questions={quizQuestions}
        loading={quizLoading}
        pathTitle={`${major} Career Readiness`}
        moduleNumber={1}
        skillName={activeSkill}
        onPass={handleQuizPass}
        onRetry={handleQuizRetry}
      />
    </PageLayout>
  );
};

export default Learn;
