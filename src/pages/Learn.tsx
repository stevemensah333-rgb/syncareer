import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flame, CheckCircle, BookOpen, Target, ArrowRight, Sparkles, Loader2, X } from 'lucide-react';
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
import YouTubePlayerDialog from '@/components/learn/YouTubePlayerDialog';
import { useCareerReadiness, type CourseProgress, type SkillReadiness } from '@/hooks/useCareerReadiness';
import { useFreeResources, type YouTubeResource } from '@/hooks/useFreeResources';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface LearningStreak {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  total_learning_days: number;
}

const COOLDOWN_MINUTES = 5;

const useAICourses = (major: string | null) => {
  const [aiCourses, setAiCourses] = useState<Record<string, SkillCourse[]>>({});
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchAICourses = useCallback(async () => {
    if (!major || fetched) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-courses');
      if (error) throw error;
      if (data?.courses && Array.isArray(data.courses)) {
        const grouped: Record<string, SkillCourse[]> = {};
        data.courses.forEach((c: any) => {
          const skill = c.skill_addressed || 'General';
          if (!grouped[skill]) grouped[skill] = [];
          grouped[skill].push({
            title: c.title,
            provider: c.platform || 'Online',
            url: c.url || `https://www.google.com/search?q=${encodeURIComponent(c.title + ' ' + c.platform)}`,
            difficulty: c.difficulty === 'beginner' ? 'Beginner' : c.difficulty === 'advanced' ? 'Advanced' : 'Intermediate',
            estimatedImpact: c.difficulty === 'beginner' ? 20 : c.difficulty === 'advanced' ? 10 : 15,
            duration: c.estimated_hours ? `${c.estimated_hours}h` : '4 weeks',
          });
        });
        setAiCourses(grouped);
      }
    } catch (e) {
      console.error('Failed to fetch AI courses:', e);
    } finally {
      setLoading(false);
      setFetched(true);
    }
  }, [major, fetched]);

  return { aiCourses, loading, fetchAICourses, fetched };
};

const getCoursesForSkill = (skillName: string, careerPath: string): SkillCourse[] => {
  const q = encodeURIComponent(`${skillName} ${careerPath}`);
  return [
    { title: `${skillName} Fundamentals`, provider: 'Coursera', url: `https://www.coursera.org/search?query=${q}`, difficulty: 'Beginner', estimatedImpact: 20, duration: '4 weeks' },
    { title: `${skillName} in Practice`, provider: 'Udemy', url: `https://www.udemy.com/courses/search/?q=${q}`, difficulty: 'Intermediate', estimatedImpact: 15, duration: '6 weeks' },
    { title: `Advanced ${skillName}`, provider: 'edX', url: `https://www.edx.org/search?q=${q}`, difficulty: 'Advanced', estimatedImpact: 10, duration: '8 weeks' },
  ];
};

const useDynamicSkills = (major: string | null) => {
  const [dynamicSkills, setDynamicSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!major) return;
    const staticSkills = getCareerSkills(major);
    if (staticSkills.length > 0) return;

    const generate = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('career-guidance', {
          body: {
            messages: [{ role: 'user', content: `List exactly 6 essential professional skills for a ${major} career path. Return ONLY a JSON array of skill name strings, nothing else. Example: ["Skill1","Skill2","Skill3","Skill4","Skill5","Skill6"]` }],
            sessionType: 'skill_generation',
          }
        });
        if (error) throw error;
        const reply = data?.reply || data?.message || '';
        const match = reply.match(/\[.*\]/s);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setDynamicSkills(parsed.slice(0, 6));
          }
        }
      } catch (e) {
        console.error('Failed to generate dynamic skills:', e);
        setDynamicSkills(['Critical Thinking', 'Communication', 'Problem Solving', 'Digital Literacy', 'Project Management', 'Professional Development']);
      } finally {
        setLoading(false);
      }
    };
    generate();
  }, [major]);

  return { dynamicSkills, loading };
};

const Learn = () => {
  const { studentDetails, loading } = useUserProfile();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const major = studentDetails?.major || null;
  const readiness = useCareerReadiness(major);
  const { dynamicSkills, loading: dynamicLoading } = useDynamicSkills(major);
  const { aiCourses, loading: aiCoursesLoading, fetchAICourses, fetched: aiCoursesFetched } = useAICourses(major);
  const freeResources = useFreeResources(major);
  const [activeYouTube, setActiveYouTube] = useState<YouTubeResource | null>(null);
  const [youtubeDialogOpen, setYoutubeDialogOpen] = useState(false);

  const focusParam = searchParams.get('focus');
  const focusedSkills = useMemo(
    () =>
      focusParam
        ? focusParam.split(',').map(s => decodeURIComponent(s).trim()).filter(Boolean)
        : [],
    [focusParam]
  );
  const focusedSet = useMemo(
    () => new Set(focusedSkills.map(s => s.toLowerCase())),
    [focusedSkills]
  );

  const clearFocus = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('focus');
    setSearchParams(next, { replace: true });
  };

  const [streak, setStreak] = useState<LearningStreak | null>(null);
  const [streakLoading, setStreakLoading] = useState(true);
  const [hasLoggedToday, setHasLoggedToday] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const [activeCourse, setActiveCourse] = useState<SkillCourse | null>(null);
  const [lastValidation, setLastValidation] = useState<number>(0);

  const autoLogActivity = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const today = new Date().toISOString().split('T')[0];
      const { data: existing } = await supabase.from('learning_activities').select('id').eq('user_id', session.user.id).eq('activity_date', today).limit(1);
      if (existing && existing.length > 0) { setHasLoggedToday(true); return; }
      await supabase.from('learning_activities').insert({ user_id: session.user.id, activity_type: 'page_visit', duration_minutes: 1 });
      setHasLoggedToday(true);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { autoLogActivity(); }, [autoLogActivity]);

  useEffect(() => {
    const fetchStreak = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        const { data } = await supabase.from('learning_streaks').select('*').eq('user_id', session.user.id).single();
        if (data) setStreak(data);
      } catch (e) { console.error(e); }
      finally { setStreakLoading(false); }
    };
    fetchStreak();
  }, [hasLoggedToday]);

  const handleSaveCourse = async (course: SkillCourse, skillName: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !major) return;
      const { error } = await supabase.from('user_course_progress').upsert({ user_id: session.user.id, skill_name: skillName, career_path: major, course_title: course.title, course_url: course.url, status: 'saved' }, { onConflict: 'user_id,course_title,skill_name' });
      if (error) throw error;
      toast.success('Course saved');
      readiness.refetch();
    } catch (e) { console.error(e); toast.error('Failed to save course'); }
  };

  const handleUnsaveCourse = async (courseTitle: string, skillName: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { error } = await supabase.from('user_course_progress').delete().eq('user_id', session.user.id).eq('course_title', courseTitle).eq('skill_name', skillName);
      if (error) throw error;
      toast.success('Course removed');
      readiness.refetch();
    } catch (e) { console.error(e); toast.error('Failed to remove course'); }
  };

  const handleValidateCourse = async (course: SkillCourse, skillName: string) => {
    if (Date.now() - lastValidation < COOLDOWN_MINUTES * 60 * 1000) {
      const remaining = Math.ceil((COOLDOWN_MINUTES * 60 * 1000 - (Date.now() - lastValidation)) / 60000);
      toast.error(`Please wait ${remaining} min before another validation.`);
      return;
    }
    setActiveSkill(skillName); setActiveCourse(course); setQuizOpen(true); setQuizLoading(true); setQuizQuestions([]);
    try {
      const { data, error } = await supabase.functions.invoke('generate-module-quiz', { body: { pathTitle: `${major} Career Readiness`, moduleNumber: 1, totalModules: 1, major, skillName, difficulty: course.difficulty === 'Beginner' ? 'foundational' : course.difficulty === 'Intermediate' ? 'developing' : 'advanced' } });
      if (error) throw error;
      if (data?.questions) setQuizQuestions(data.questions);
      else throw new Error('No questions returned');
    } catch (e) { console.error(e); toast.error('Failed to generate validation quiz.'); setQuizOpen(false); }
    finally { setQuizLoading(false); }
  };

  const handleValidateSavedCourse = (cp: CourseProgress) => {
    handleValidateCourse({ title: cp.course_title, provider: '', url: cp.course_url || '', difficulty: 'Intermediate', estimatedImpact: 15, duration: '' }, cp.skill_name);
  };

  const handleQuizPass = async (score: number) => {
    if (!activeSkill || !major) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const currentSkill = readiness.skillGaps.find(s => s.skillName === activeSkill);
      const newMastery = Math.min(100, (currentSkill?.mastery || 0) + (activeCourse?.estimatedImpact || 15));
      const proficiency = newMastery >= 100 ? 'expert' : newMastery >= 75 ? 'advanced' : newMastery >= 50 ? 'intermediate' : 'beginner';
      const { data: existing } = await supabase.from('user_skills').select('id').eq('user_id', session.user.id).eq('skill_name', activeSkill).eq('source', 'mastery_path').maybeSingle();
      if (existing) { await supabase.from('user_skills').update({ proficiency }).eq('id', existing.id); }
      else { await supabase.from('user_skills').insert({ user_id: session.user.id, skill_name: activeSkill, category: major, proficiency, source: 'mastery_path' }); }
      if (activeCourse) { await supabase.from('user_course_progress').upsert({ user_id: session.user.id, skill_name: activeSkill, career_path: major, course_title: activeCourse.title, course_url: activeCourse.url, status: 'completed', validated_at: new Date().toISOString() }, { onConflict: 'user_id,course_title,skill_name' }); }
      await supabase.from('learning_activities').insert({ user_id: session.user.id, activity_type: 'skill_validation', duration_minutes: 10 });
      setLastValidation(Date.now());
      toast.success(`${activeSkill} mastery updated to ${proficiency}.`);
      readiness.refetch();
    } catch (e) { console.error(e); toast.error('Failed to update skill mastery.'); }
  };

  const handleQuizRetry = () => { if (activeSkill && activeCourse) handleValidateCourse(activeCourse, activeSkill); };

  if (loading || readiness.loading || dynamicLoading) {
    return (<PageLayout title="Career Readiness"><div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Analyzing your career readiness...</p></div></PageLayout>);
  }

  if (!major) {
    return (<PageLayout title="Career Readiness"><Card><CardContent className="py-12 text-center"><BookOpen className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><h3 className="text-lg font-semibold mb-1">Set Your Career Path</h3><p className="text-sm text-muted-foreground">Complete your profile with your major and field of study to unlock personalized career readiness tracking.</p></CardContent></Card></PageLayout>);
  }

  const staticSkills = getCareerSkills(major);
  const hasSkills = staticSkills.length > 0 || dynamicSkills.length > 0;

  const getFocusAction = () => {
    if (readiness.cvScore === 0) return { label: 'Build your CV', description: 'A strong CV is the foundation of your job search.', action: () => navigate('/cv-builder'), icon: Target, hasNav: true };
    const weakest = readiness.skillGaps.find(s => s.mastery < 50);
    if (weakest) return { label: `Improve ${weakest.skillName}`, description: `Your mastery is at ${weakest.mastery}%. Complete a course and validate to level up.`, action: () => {}, icon: Sparkles, hasNav: false };
    if (readiness.interviewScore === 0) return { label: 'Practice an interview', description: 'Simulate a real interview to boost your readiness score.', action: () => navigate('/interview-simulator'), icon: Target, hasNav: true };
    if (readiness.portfolioCount === 0) return { label: 'Add a project', description: 'Showcase real work to stand out to employers.', action: () => navigate('/portfolio'), icon: Target, hasNav: true };
    return { label: 'Keep building skills', description: 'You\'re making great progress. Continue validating courses.', action: () => {}, icon: CheckCircle, hasNav: false };
  };
  const focus = getFocusAction();

  const getCoursesFor = (skillName: string): SkillCourse[] => {
    if (aiCourses[skillName]?.length > 0) return aiCourses[skillName];
    return getCoursesForSkill(skillName, major);
  };

  return (
    <PageLayout title="Career Readiness">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ReadinessOverview score={readiness.overallScore} level={readiness.level} careerPath={`${major} Career Path`} />

          {/* Focus This Week */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <focus.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold">Focus This Week</h3>
                    <Badge variant="outline" className="text-[10px]">Suggested</Badge>
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">{focus.label}</p>
                  <p className="text-xs text-muted-foreground">{focus.description}</p>
                </div>
                {focus.hasNav && (
                  <Button size="sm" variant="outline" onClick={focus.action} className="shrink-0 gap-1">
                    Go <ArrowRight className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <PillarCards pillars={readiness.pillars} />

          {/* AI Course CTA */}
          {!aiCoursesFetched && hasSkills && (
            <Card>
              <CardContent className="pt-5 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Get personalized course suggestions</p>
                    <p className="text-xs text-muted-foreground">AI analyzes your skill gaps and recommends real courses</p>
                  </div>
                </div>
                <Button size="sm" onClick={fetchAICourses} disabled={aiCoursesLoading}>
                  {aiCoursesLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                  {aiCoursesLoading ? 'Loading...' : 'Suggest Courses'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Focus banner from CV scan */}
          {focusedSkills.length > 0 && (
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Focused from your CV
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {focusedSkills.map(s => (
                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearFocus} className="shrink-0 h-7 gap-1 text-xs">
                    <X className="h-3 w-3" /> Clear
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {(hasSkills || focusedSkills.length > 0) && (() => {
            // Build the list: focused (in framework or synthesized) first, then the rest
            const existingNames = new Set(readiness.skillGaps.map(s => s.skillName.toLowerCase()));
            const synthesized: SkillReadiness[] = focusedSkills
              .filter(name => !existingNames.has(name.toLowerCase()))
              .map(name => ({
                skillName: name,
                mastery: 0,
                proficiency: 'beginner',
                gap: 100,
              }));
            const merged = [...readiness.skillGaps, ...synthesized];
            const sorted = [...merged].sort((a, b) => {
              const af = focusedSet.has(a.skillName.toLowerCase()) ? 0 : 1;
              const bf = focusedSet.has(b.skillName.toLowerCase()) ? 0 : 1;
              if (af !== bf) return af - bf;
              return a.mastery - b.mastery;
            });

            return (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Skill Gaps & Resources</h3>
                {sorted.map((skill) => {
                  const isFocused = focusedSet.has(skill.skillName.toLowerCase());
                  const freeEntry = freeResources.getEntry(skill.skillName);
                  return (
                    <SkillGapCard
                      key={skill.skillName}
                      skill={skill}
                      courses={getCoursesFor(skill.skillName)}
                      freeResources={freeEntry.data}
                      freeLoading={freeEntry.loading}
                      onRequestFreeResources={() => freeResources.fetchFor(skill.skillName)}
                      onPlayYouTube={(v) => { setActiveYouTube(v); setYoutubeDialogOpen(true); }}
                      savedCourses={readiness.savedCourses}
                      onSaveCourse={(course) => handleSaveCourse(course, skill.skillName)}
                      onUnsaveCourse={(ct) => handleUnsaveCourse(ct, skill.skillName)}
                      onValidateCourse={(course) => handleValidateCourse(course, skill.skillName)}
                      validating={quizLoading}
                      defaultExpanded={isFocused || skill.mastery < 50}
                      highlighted={isFocused}
                    />
                  );
                })}
              </div>
            );
          })()}

          <SavedCoursesSection courses={readiness.savedCourses} onValidateCourse={handleValidateSavedCourse} onUnsaveCourse={handleUnsaveCourse} validating={quizLoading} />

          {!hasSkills && (
            <Card><CardContent className="py-8 text-center"><p className="text-muted-foreground text-sm">Skill framework for {major} is being developed. Check back soon.</p></CardContent></Card>
          )}
        </div>

        <div className="space-y-6">
          <ReadinessRadar data={readiness.radarData} />

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center"><Flame className="h-6 w-6 text-primary" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Learning Streak</p>
                    <p className="text-2xl font-bold">{streakLoading ? '...' : `${streak?.current_streak || 0} days`}</p>
                  </div>
                </div>
                {hasLoggedToday && (<div className="flex items-center gap-1 text-primary text-sm"><CheckCircle className="h-4 w-4" /><span>Today</span></div>)}
              </div>
              {streak?.longest_streak && streak.longest_streak > 0 && (
                <div className="mt-3 pt-3 border-t flex justify-between text-sm"><span className="text-muted-foreground">Best streak</span><span className="font-medium">{streak.longest_streak} days</span></div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Quick Stats</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Portfolio Projects</span><span className="font-medium">{readiness.portfolioCount}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">CV Strength</span><span className="font-medium">{readiness.cvScore}%</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Interview Score</span><span className="font-medium">{readiness.interviewScore}%</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Courses Validated</span><span className="font-medium">{readiness.savedCourses.filter(c => c.status === 'completed').length}</span></div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ModuleQuizDialog open={quizOpen} onOpenChange={setQuizOpen} questions={quizQuestions} loading={quizLoading} pathTitle={`${major} Career Readiness`} moduleNumber={1} skillName={activeSkill} onPass={handleQuizPass} onRetry={handleQuizRetry} />
    </PageLayout>
  );
};

export default Learn;
