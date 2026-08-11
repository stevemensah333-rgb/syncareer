import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Wrench, Plus, X } from 'lucide-react';
import { SUGGESTED_SKILLS } from '@/features/cv-builder/constants';

interface CVFormSkillsProps {
  skills: string[];
  onChange: (skills: string[]) => void;
}

export const CVFormSkills: React.FC<CVFormSkillsProps> = ({ skills, onChange }) => {
  const [newSkill, setNewSkill] = useState('');

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      onChange([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    onChange(skills.filter((skill) => skill !== skillToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  const addSuggestedSkill = (skill: string) => {
    if (!skills.includes(skill)) {
      onChange([...skills, skill]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-primary" />
          Skills
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Label htmlFor="cv-skill-input" className="sr-only">Add a skill</Label>
          <Input
            id="cv-skill-input"
            placeholder="Add a skill (e.g., Python, Leadership, Excel)"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button type="button" onClick={addSkill}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {skills.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Your Skills:</p>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="px-3 py-1 text-sm flex items-center gap-1"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    aria-label={`Remove ${skill}`}
                    className="ml-0.5 grid h-7 w-7 place-items-center rounded-sm hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X aria-hidden="true" className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Suggested Skills:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_SKILLS
              .filter((skill) => !skills.includes(skill))
              .slice(0, 10)
              .map((skill) => (
                <button
                  key={skill}
                  type="button"
                  className="inline-flex min-h-11 items-center rounded-full border border-border px-3 py-1 text-sm font-semibold transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  onClick={() => addSuggestedSkill(skill)}
                >
                  <Plus aria-hidden="true" className="mr-1 h-3 w-3" />
                  Add {skill}
                </button>
              ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Tip: Include both technical skills (programming languages, tools) and soft skills (communication, leadership).
        </p>
      </CardContent>
    </Card>
  );
};
