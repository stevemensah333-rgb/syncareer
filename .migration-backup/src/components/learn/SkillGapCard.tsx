import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  ExternalLink, Bookmark, CheckCircle, ChevronDown, ChevronUp, Play, Loader2, Sparkles,
} from 'lucide-react';
import type { SkillReadiness, CourseProgress } from '@/hooks/useCareerReadiness';
import type { YouTubeResource, CuratedResource, FreeResourcePayload } from '@/hooks/useFreeResources';

export interface SkillCourse {
  title: string;
  provider: string;
  url: string;
  difficulty: string;
  estimatedImpact: number;
  duration: string;
}

interface SkillGapCardProps {
  skill: SkillReadiness;
  courses: SkillCourse[];                       // premium (Coursera/edX/Udemy)
  freeResources: FreeResourcePayload | null;
  freeLoading: boolean;
  onRequestFreeResources: () => void;            // lazy fetch on first expand
  onPlayYouTube: (video: YouTubeResource) => void;
  savedCourses: CourseProgress[];
  onSaveCourse: (course: SkillCourse) => void;
  onUnsaveCourse: (courseTitle: string) => void;
  onValidateCourse: (course: SkillCourse) => void;
  validating: boolean;
  defaultExpanded?: boolean;
  highlighted?: boolean;
}

const difficultyColor: Record<string, string> = {
  Beginner: 'bg-green-500/10 text-green-700 border-green-200',
  Intermediate: 'bg-primary/10 text-primary border-primary/20',
  Advanced: 'bg-orange-500/10 text-orange-700 border-orange-200',
};

const formatViews = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${Math.round(n / 1000)}K views`;
  return `${n} views`;
};

const SkillGapCard: React.FC<SkillGapCardProps> = ({
  skill, courses, freeResources, freeLoading, onRequestFreeResources, onPlayYouTube,
  savedCourses, onSaveCourse, onUnsaveCourse, onValidateCourse, validating,
  defaultExpanded, highlighted,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded ?? skill.mastery < 50);
  const [showPremium, setShowPremium] = useState(false);

  // Lazy-fetch free resources the first time this card opens
  useEffect(() => {
    if (expanded && !freeResources && !freeLoading) {
      onRequestFreeResources();
    }
  }, [expanded, freeResources, freeLoading, onRequestFreeResources]);

  const isSaved = (courseTitle: string) =>
    savedCourses.some(c => c.course_title === courseTitle && c.skill_name === skill.skillName);

  const isCompleted = (courseTitle: string) =>
    savedCourses.some(c => c.course_title === courseTitle && c.skill_name === skill.skillName && c.status === 'completed');

  const youtube = freeResources?.youtube || [];
  const curated = freeResources?.curated || [];
  const hasFree = youtube.length > 0 || curated.length > 0;

  // Wrap free resources in the SkillCourse shape so save/validate handlers stay unchanged
  const youtubeAsCourse = (v: YouTubeResource): SkillCourse => ({
    title: v.title,
    provider: `YouTube · ${v.channel}`,
    url: v.url,
    difficulty: 'Beginner',
    estimatedImpact: 15,
    duration: v.durationLabel,
  });
  const curatedAsCourse = (c: CuratedResource): SkillCourse => ({
    title: c.title,
    provider: c.provider,
    url: c.url,
    difficulty: 'Intermediate',
    estimatedImpact: 15,
    duration: 'Free',
  });

  return (
    <Card className={`overflow-hidden ${highlighted ? 'border-primary ring-1 ring-primary/30' : ''}`}>
      <CardContent className="p-0">
        {/* Skill Header */}
        <button
          className="w-full flex items-center justify-between p-4 text-left hover:bg-accent/30 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h4 className="font-medium text-sm">{skill.skillName}</h4>
              <Badge variant="outline" className="text-xs shrink-0">
                {skill.mastery}% mastery
              </Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${skill.mastery}%` }}
              />
            </div>
          </div>
          <div className="ml-3 shrink-0">
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </button>

        {expanded && (
          <div className="border-t px-4 pb-4 pt-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Gap: {skill.gap}% — Watch a free resource and validate to improve mastery.
            </p>

            <Tabs defaultValue="free">
              <TabsList className="grid w-full grid-cols-2 h-8">
                <TabsTrigger value="free" className="text-xs gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  Free Path
                </TabsTrigger>
                <TabsTrigger value="premium" className="text-xs">
                  Premium / Certificate
                </TabsTrigger>
              </TabsList>

              {/* === FREE PATH === */}
              <TabsContent value="free" className="space-y-3 mt-3">
                {freeLoading && (
                  <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Finding free resources...
                  </div>
                )}

                {!freeLoading && !hasFree && (
                  <p className="text-xs text-muted-foreground py-3 text-center">
                    No free resources found yet. Try the Premium tab or check back later.
                  </p>
                )}

                {/* YouTube videos */}
                {youtube.map((v) => {
                  const course = youtubeAsCourse(v);
                  const completed = isCompleted(course.title);
                  const saved = isSaved(course.title);
                  return (
                    <div
                      key={v.videoId}
                      className={`border rounded-lg p-3 space-y-2 ${completed ? 'border-green-200 bg-green-500/5' : ''}`}
                    >
                      <div className="flex gap-3">
                        {v.thumbnailUrl && (
                          <button
                            onClick={() => onPlayYouTube(v)}
                            className="relative shrink-0 group rounded overflow-hidden w-24 h-16 bg-muted"
                            aria-label={`Play ${v.title}`}
                          >
                            <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                              <Play className="h-5 w-5 text-white fill-white" />
                            </div>
                          </button>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-tight line-clamp-2">{v.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {v.channel} · {v.durationLabel} · {formatViews(v.viewCount)}
                          </p>
                          <Badge variant="secondary" className="text-[10px] mt-1">Free</Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onPlayYouTube(v)}>
                          <Play className="h-3 w-3 mr-1" /> Watch
                        </Button>

                        {!saved && !completed && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onSaveCourse(course)}>
                            <Bookmark className="h-3 w-3 mr-1" /> Save
                          </Button>
                        )}
                        {saved && !completed && (
                          <Button
                            variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground"
                            onClick={() => onUnsaveCourse(course.title)}
                          >
                            <Bookmark className="h-3 w-3 mr-1 fill-current" /> Unsave
                          </Button>
                        )}

                        {completed ? (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" /> Validated
                          </span>
                        ) : (
                          <Button
                            variant="default" size="sm" className="h-7 text-xs"
                            onClick={() => onValidateCourse(course)} disabled={validating}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" /> Mark Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Curated free platforms */}
                {curated.map((c) => {
                  const course = curatedAsCourse(c);
                  const completed = isCompleted(course.title);
                  const saved = isSaved(course.title);
                  return (
                    <div
                      key={c.url}
                      className={`border rounded-lg p-3 space-y-2 ${completed ? 'border-green-200 bg-green-500/5' : ''}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-tight">{c.title}</p>
                        <p className="text-xs text-muted-foreground">{c.provider}</p>
                        <p className="text-xs text-muted-foreground mt-1">{c.description}</p>
                        <Badge variant="secondary" className="text-[10px] mt-1">Free</Badge>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                          <a href={c.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 mr-1" /> Open
                          </a>
                        </Button>

                        {!saved && !completed && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onSaveCourse(course)}>
                            <Bookmark className="h-3 w-3 mr-1" /> Save
                          </Button>
                        )}
                        {saved && !completed && (
                          <Button
                            variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground"
                            onClick={() => onUnsaveCourse(course.title)}
                          >
                            <Bookmark className="h-3 w-3 mr-1 fill-current" /> Unsave
                          </Button>
                        )}

                        {completed ? (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" /> Validated
                          </span>
                        ) : (
                          <Button
                            variant="default" size="sm" className="h-7 text-xs"
                            onClick={() => onValidateCourse(course)} disabled={validating}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" /> Mark Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </TabsContent>

              {/* === PREMIUM PATH === */}
              <TabsContent value="premium" className="space-y-3 mt-3">
                <p className="text-xs text-muted-foreground">
                  Optional paid courses with certificates. Useful if you need credentials for your CV.
                </p>
                {!showPremium ? (
                  <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setShowPremium(true)}>
                    Show premium options
                  </Button>
                ) : (
                  courses.map((course) => {
                    const completed = isCompleted(course.title);
                    const saved = isSaved(course.title);
                    return (
                      <div
                        key={course.title}
                        className={`border rounded-lg p-3 space-y-2 ${completed ? 'border-green-200 bg-green-500/5' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-tight">{course.title}</p>
                            <p className="text-xs text-muted-foreground">{course.provider} · {course.duration}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge variant="outline" className={`text-[10px] ${difficultyColor[course.difficulty] || ''}`}>
                              {course.difficulty}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px]">+{course.estimatedImpact}%</Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                            <a href={course.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 mr-1" /> Start Course
                            </a>
                          </Button>
                          {!saved && !completed && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onSaveCourse(course)}>
                              <Bookmark className="h-3 w-3 mr-1" /> Save
                            </Button>
                          )}
                          {saved && !completed && (
                            <Button
                              variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground"
                              onClick={() => onUnsaveCourse(course.title)}
                            >
                              <Bookmark className="h-3 w-3 mr-1 fill-current" /> Unsave
                            </Button>
                          )}
                          {completed ? (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> Validated
                            </span>
                          ) : (
                            <Button
                              variant="default" size="sm" className="h-7 text-xs"
                              onClick={() => onValidateCourse(course)} disabled={validating}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" /> Mark Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SkillGapCard;
