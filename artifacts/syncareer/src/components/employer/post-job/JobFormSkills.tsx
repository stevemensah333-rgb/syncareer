import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, X } from 'lucide-react';

interface JobFormSkillsProps {
  skills: string[];
  onSkillsChange: (skills: string[]) => void;
}

export function JobFormSkills({ skills, onSkillsChange }: JobFormSkillsProps) {
  const [input, setInput] = useState('');

  const addSkill = () => {
    const trimmed = input.trim();
    if (trimmed && !skills.includes(trimmed)) {
      onSkillsChange([...skills, trimmed]);
      setInput('');
    }
  };

  const removeSkill = (skill: string) => {
    onSkillsChange(skills.filter((s) => s !== skill));
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Required Skills</Label>
        <p className="text-xs text-muted-foreground">
          Add skills to help match your job with qualified candidates. Jobs with skills get better matches.
        </p>
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. React, Python, Project Management"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSkill();
              }
            }}
          />
          <Button type="button" onClick={addSkill} size="icon" variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {skills.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1.5 text-sm bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full"
            >
              {skill}
              <button
                onClick={() => removeSkill(skill)}
                className="hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground">No skills added yet</p>
          <p className="text-xs text-muted-foreground mt-1">Type a skill above and press Enter to add it.</p>
        </div>
      )}
    </div>
  );
}
