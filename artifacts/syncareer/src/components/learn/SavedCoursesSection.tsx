import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Bookmark, ExternalLink, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { CourseProgress } from '@/hooks/useCareerReadiness';

interface SavedCoursesSectionProps {
  courses: CourseProgress[];
  onValidateCourse: (course: CourseProgress) => void;
  onUnsaveCourse: (courseTitle: string, skillName: string) => void;
  validating: boolean;
}

const SavedCoursesSection: React.FC<SavedCoursesSectionProps> = ({
  courses,
  onValidateCourse,
  onUnsaveCourse,
  validating,
}) => {
  const [open, setOpen] = useState(true);

  const saved = courses.filter(c => c.status === 'saved');
  const completed = courses.filter(c => c.status === 'completed');

  if (courses.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 text-left hover:bg-accent/30 transition-colors">
            <div className="flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">My Saved Courses</h3>
              <Badge variant="secondary" className="text-xs">
                {courses.length}
              </Badge>
            </div>
            {open ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 space-y-4">
            {/* Saved (not yet completed) */}
            {saved.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  In Progress ({saved.length})
                </p>
                {saved.map((course) => (
                  <div
                    key={course.id}
                    className="border rounded-lg p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{course.course_title}</p>
                      <p className="text-xs text-muted-foreground">
                        {course.skill_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {course.course_url && (
                        <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                          <a href={course.course_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Open
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="default"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => onValidateCourse(course)}
                        disabled={validating}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Validate
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground"
                        onClick={() => onUnsaveCourse(course.course_title, course.skill_name)}
                      >
                        <Bookmark className="h-3 w-3 mr-1 fill-current" />
                        Unsave
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Completed */}
            {completed.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Validated ({completed.length})
                </p>
                {completed.map((course) => (
                  <div
                    key={course.id}
                    className="border border-green-200 bg-green-500/5 rounded-lg p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{course.course_title}</p>
                      <p className="text-xs text-muted-foreground">
                        {course.skill_name}
                        {course.validated_at && (
                          <> · Validated {new Date(course.validated_at).toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                    <span className="text-xs text-green-600 flex items-center gap-1 shrink-0">
                      <CheckCircle className="h-3 w-3" /> Completed
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default SavedCoursesSection;
