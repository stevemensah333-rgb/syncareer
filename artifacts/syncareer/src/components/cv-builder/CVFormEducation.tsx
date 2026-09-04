import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { GraduationCap, Award, Plus, Trash2, MapPin, Calendar, BookOpen } from 'lucide-react';

interface EducationData {
  university: string;
  location: string;
  degree: string;
  graduationDate: string;
  gpa: string;
}

interface Achievement {
  id: string;
  title: string;
  organization: string;
  date: string;
}

interface CVFormEducationProps {
  education: EducationData;
  achievements: Achievement[];
  onEducationChange: (data: Partial<EducationData>) => void;
  onAchievementsChange: (achievements: Achievement[]) => void;
}

export const CVFormEducation: React.FC<CVFormEducationProps> = ({
  education,
  achievements,
  onEducationChange,
  onAchievementsChange,
}) => {
  const addAchievement = () => {
    onAchievementsChange([
      ...achievements,
      { id: crypto.randomUUID(), title: '', organization: '', date: '' },
    ]);
  };

  const updateAchievement = (id: string, field: keyof Achievement, value: string) => {
    onAchievementsChange(
      achievements.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  };

  const removeAchievement = (id: string) => {
    onAchievementsChange(achievements.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader className="gap-0 px-0 pb-4 pt-0">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <GraduationCap className="h-4 w-4 text-primary" aria-hidden="true" />
            University Education
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-0 pb-0 pt-0">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="university" className="text-xs font-medium">University / Institution</Label>
              <Input
                id="university"
                placeholder="e.g. Ashesi University"
                value={education.university}
                onChange={(e) => onEducationChange({ university: e.target.value })}
                className="rounded-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location" className="flex items-center gap-1 text-xs font-medium">
                <MapPin className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                Location
              </Label>
              <Input
                id="location"
                placeholder="e.g. Berekuso, Eastern Region, Ghana"
                value={education.location}
                onChange={(e) => onEducationChange({ location: e.target.value })}
                className="rounded-input"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="degree" className="flex items-center gap-1 text-xs font-medium">
              <BookOpen className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
              Degree & Major
            </Label>
            <Input
              id="degree"
              placeholder="e.g. BSc. Computer Science"
              value={education.degree}
              onChange={(e) => onEducationChange({ degree: e.target.value })}
              className="rounded-input"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="graduationDate" className="flex items-center gap-1 text-xs font-medium">
                <Calendar className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                Graduation Date (or Expected)
              </Label>
              <Input
                id="graduationDate"
                placeholder="e.g. June 2026"
                value={education.graduationDate}
                onChange={(e) => onEducationChange({ graduationDate: e.target.value })}
                className="rounded-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gpa" className="text-xs font-medium">Cumulative GPA / Honors (optional)</Label>
              <Input
                id="gpa"
                placeholder="e.g. 3.85 / 4.00"
                value={education.gpa}
                onChange={(e) => onEducationChange({ gpa: e.target.value })}
                className="rounded-input"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader className="flex flex-row items-center justify-between gap-0 px-0 pb-4 pt-0">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Award className="h-4 w-4 text-primary" aria-hidden="true" />
            Academic Achievements & Honors
          </CardTitle>
          <Button variant="outline" size="sm" onClick={addAchievement} className="rounded-control">
            <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Add honor
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 px-0 pb-0 pt-0">
          {achievements.length === 0 ? (
            <div className="rounded-surface border border-dashed border-border py-6 text-center">
              <Award className="mx-auto mb-2 h-6 w-6 text-muted-foreground/60" aria-hidden="true" />
              <p className="text-xs text-muted-foreground">
                No awards or honors added yet. Add Dean's list, scholarships, or competition awards.
              </p>
            </div>
          ) : (
            achievements.map((achievement, index) => (
              <div key={achievement.id} className="rounded-control border border-border bg-secondary/20 p-4 space-y-3 transition-colors duration-150 hover:border-primary/30">
                <div className="flex items-center justify-between">
                  <span className="type-label">
                    Honor / Award {index + 1}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAchievement(achievement.id)}
                    className="h-7 w-7 rounded-control text-muted-foreground hover:text-destructive"
                    aria-label={`Remove achievement ${index + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Award / Scholarship Title</Label>
                  <Input
                    placeholder="e.g. Mastercard Foundation Scholars Program Scholarship"
                    value={achievement.title}
                    onChange={(e) => updateAchievement(achievement.id, 'title', e.target.value)}
                    className="rounded-input"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Granting Organization</Label>
                    <Input
                      placeholder="e.g. Mastercard Foundation / Ashesi"
                      value={achievement.organization}
                      onChange={(e) => updateAchievement(achievement.id, 'organization', e.target.value)}
                      className="rounded-input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Date Received</Label>
                    <Input
                      placeholder="e.g. Aug 2024"
                      value={achievement.date}
                      onChange={(e) => updateAchievement(achievement.id, 'date', e.target.value)}
                      className="rounded-input"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
