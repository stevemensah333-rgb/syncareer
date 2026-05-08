import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Briefcase, Plus, Trash2 } from 'lucide-react';

interface Experience {
  id: string;
  company: string;
  location: string;
  date: string;
  role: string;
  bullets: string[];
}

interface CVFormExperienceProps {
  experience: Experience[];
  onChange: (experience: Experience[]) => void;
}

export const CVFormExperience: React.FC<CVFormExperienceProps> = ({ experience, onChange }) => {
  const addExperience = () => {
    onChange([
      ...experience,
      { id: crypto.randomUUID(), company: '', location: '', date: '', role: '', bullets: [''] },
    ]);
  };

  const updateExperience = (id: string, field: keyof Experience, value: string | string[]) => {
    onChange(experience.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const removeExperience = (id: string) => {
    onChange(experience.filter((e) => e.id !== id));
  };

  const addBullet = (id: string) => {
    onChange(
      experience.map((e) =>
        e.id === id ? { ...e, bullets: [...e.bullets, ''] } : e
      )
    );
  };

  const updateBullet = (expId: string, bulletIndex: number, value: string) => {
    onChange(
      experience.map((e) =>
        e.id === expId
          ? {
              ...e,
              bullets: e.bullets.map((b, i) => (i === bulletIndex ? value : b)),
            }
          : e
      )
    );
  };

  const removeBullet = (expId: string, bulletIndex: number) => {
    onChange(
      experience.map((e) =>
        e.id === expId
          ? { ...e, bullets: e.bullets.filter((_, i) => i !== bulletIndex) }
          : e
      )
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          Work Experience
        </CardTitle>
        <Button variant="outline" size="sm" onClick={addExperience}>
          <Plus className="h-4 w-4 mr-1" />
          Add Experience
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {experience.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            No work experience added yet. Click "Add Experience" to get started.
          </p>
        ) : (
          experience.map((exp, index) => (
            <div key={exp.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Experience {index + 1}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeExperience(exp.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company/Organization</Label>
                  <Input
                    placeholder="ABC Company"
                    value={exp.company}
                    onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    placeholder="Accra, Ghana"
                    value={exp.location}
                    onChange={(e) => updateExperience(exp.id, 'location', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role/Position</Label>
                  <Input
                    placeholder="Marketing Intern"
                    value={exp.role}
                    onChange={(e) => updateExperience(exp.id, 'role', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    placeholder="Aug 2024"
                    value={exp.date}
                    onChange={(e) => updateExperience(exp.id, 'date', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Key Responsibilities & Achievements</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addBullet(exp.id)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Bullet
                  </Button>
                </div>
                {exp.bullets.map((bullet, bulletIndex) => (
                  <div key={bulletIndex} className="flex gap-2">
                    <span className="mt-2 text-muted-foreground">•</span>
                    <Textarea
                      placeholder="Describe your achievement or responsibility..."
                      value={bullet}
                      onChange={(e) => updateBullet(exp.id, bulletIndex, e.target.value)}
                      className="min-h-[60px]"
                    />
                    {exp.bullets.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeBullet(exp.id, bulletIndex)}
                        className="shrink-0"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
