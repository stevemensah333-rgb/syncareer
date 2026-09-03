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
    <Card className="border-border bg-card shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Wrench className="h-4 w-4 text-primary" aria-hidden="true" />
          Skills & Proficiencies
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Label htmlFor="cv-skill-input" className="sr-only">Add a skill</Label>
          <Input
            id="cv-skill-input"
            placeholder="Add a skill (e.g. Python, Financial Modeling, React)"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={handleKeyDown}
            className="rounded-input"
          />
          <Button type="button" onClick={addSkill} className="shrink-0 rounded-control">
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Add skill
          </Button>
        </div>

        {skills.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your listed skills ({skills.length}):</p>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="flex items-center gap-1.5 rounded-control border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    aria-label={`Remove ${skill}`}
                    className="grid h-5 w-5 place-items-center rounded-sm text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X aria-hidden="true" className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recommended skills for career readiness:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_SKILLS
              .filter((skill) => !skills.includes(skill))
              .slice(0, 12)
              .map((skill) => (
                <button
                  key={skill}
                  type="button"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors duration-150 hover:border-primary/40 hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => addSuggestedSkill(skill)}
                >
                  <Plus aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
                  Add {skill}
                </button>
              ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Tip: Combine specific technical competencies with demonstrable organizational and collaboration skills.
        </p>
      </CardContent>
    </Card>
  );
};
