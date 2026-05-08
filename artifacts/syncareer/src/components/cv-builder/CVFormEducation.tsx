import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { GraduationCap, Award, Plus, Trash2 } from 'lucide-react';

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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Education
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="university">University/College</Label>
              <Input
                id="university"
                placeholder="Ashesi University"
                value={education.university}
                onChange={(e) => onEducationChange({ university: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="Berekuso, Eastern Region"
                value={education.location}
                onChange={(e) => onEducationChange({ location: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="degree">Degree Program</Label>
            <Input
              id="degree"
              placeholder="BSc. Computer Science"
              value={education.degree}
              onChange={(e) => onEducationChange({ degree: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="graduationDate">Expected Graduation</Label>
              <Input
                id="graduationDate"
                placeholder="June 2026"
                value={education.graduationDate}
                onChange={(e) => onEducationChange({ graduationDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gpa">Cumulative GPA</Label>
              <Input
                id="gpa"
                placeholder="3.8/4.00"
                value={education.gpa}
                onChange={(e) => onEducationChange({ gpa: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Achievements & Awards
          </CardTitle>
          <Button variant="outline" size="sm" onClick={addAchievement}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {achievements.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              No achievements added yet. Click "Add" to include your awards and scholarships.
            </p>
          ) : (
            achievements.map((achievement, index) => (
              <div key={achievement.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">
                    Achievement {index + 1}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAchievement(achievement.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    placeholder="The MasterCard Foundation Scholar Program Scholarship"
                    value={achievement.title}
                    onChange={(e) => updateAchievement(achievement.id, 'title', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Organization</Label>
                    <Input
                      placeholder="Ashesi University"
                      value={achievement.organization}
                      onChange={(e) => updateAchievement(achievement.id, 'organization', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      placeholder="July – Aug 2024"
                      value={achievement.date}
                      onChange={(e) => updateAchievement(achievement.id, 'date', e.target.value)}
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
