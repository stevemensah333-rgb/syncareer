import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wrench, Plus, X } from 'lucide-react';

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

  const suggestedSkills = [
    'Advanced Proficiency in French',
    'Microsoft Office Suite',
    'Java',
    'Python',
    'C++',
    'SQL',
    'HTML/CSS',
    'JavaScript',
    'React',
    'Node.js',
    'Git',
    'Agile/Scrum',
    'Data Analysis',
    'Machine Learning',
    'Public Speaking',
    'Team Leadership',
  ];

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
        <div className="flex gap-2">
          <Input
            placeholder="Add a skill (e.g., Python, Leadership, Excel)"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button onClick={addSkill}>
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
                    onClick={() => removeSkill(skill)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Suggested Skills:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedSkills
              .filter((skill) => !skills.includes(skill))
              .slice(0, 10)
              .map((skill) => (
                <Badge
                  key={skill}
                  variant="outline"
                  className="px-3 py-1 text-sm cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => addSuggestedSkill(skill)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {skill}
                </Badge>
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
