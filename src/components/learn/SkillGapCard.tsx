import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Bookmark, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { SkillReadiness, CourseProgress } from '@/hooks/useCareerReadiness';

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
  courses: SkillCourse[];
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

const SkillGapCard: React.FC<SkillGapCardProps> = ({
  skill, courses, savedCourses, onSaveCourse, onUnsaveCourse, onValidateCourse, validating,
  defaultExpanded, highlighted,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded ?? skill.mastery < 50);

  const isSaved = (courseTitle: string) =>
    savedCourses.some(c => c.course_title === courseTitle && c.skill_name === skill.skillName);

  const isCompleted = (courseTitle: string) =>
    savedCourses.some(c => c.course_title === courseTitle && c.skill_name === skill.skillName && c.status === 'completed');

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

        {/* Courses (expanded) */}
        {expanded && (
          <div className="border-t px-4 pb-4 space-y-3 pt-3">
            <p className="text-xs text-muted-foreground">
              Gap: {skill.gap}% — Complete courses below and validate to improve mastery.
            </p>
            {courses.map((course) => {
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
                      <Badge variant="secondary" className="text-[10px]">
                        +{course.estimatedImpact}%
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      asChild
                    >
                      <a href={course.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Start Course
                      </a>
                    </Button>

                    {!saved && !completed && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => onSaveCourse(course)}
                      >
                        <Bookmark className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                    )}

                    {saved && !completed && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground"
                        onClick={() => onUnsaveCourse(course.title)}
                      >
                        <Bookmark className="h-3 w-3 mr-1 fill-current" />
                        Unsave
                      </Button>
                    )}

                    {completed ? (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Validated
                      </span>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => onValidateCourse(course)}
                        disabled={validating}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SkillGapCard;
