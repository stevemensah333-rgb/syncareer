import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FolderKanban, Plus, Trash2 } from 'lucide-react';

interface Project {
  id: string;
  organization: string;
  date: string;
  projectName: string;
  role: string;
  bullets: string[];
}

interface CVFormProjectsProps {
  projects: Project[];
  onChange: (projects: Project[]) => void;
}

export const CVFormProjects: React.FC<CVFormProjectsProps> = ({ projects, onChange }) => {
  const addProject = () => {
    onChange([
      ...projects,
      { id: crypto.randomUUID(), organization: '', date: '', projectName: '', role: '', bullets: [''] },
    ]);
  };

  const updateProject = (id: string, field: keyof Project, value: string | string[]) => {
    onChange(projects.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const removeProject = (id: string) => {
    onChange(projects.filter((p) => p.id !== id));
  };

  const addBullet = (id: string) => {
    onChange(
      projects.map((p) =>
        p.id === id ? { ...p, bullets: [...p.bullets, ''] } : p
      )
    );
  };

  const updateBullet = (projectId: string, bulletIndex: number, value: string) => {
    onChange(
      projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              bullets: p.bullets.map((b, i) => (i === bulletIndex ? value : b)),
            }
          : p
      )
    );
  };

  const removeBullet = (projectId: string, bulletIndex: number) => {
    onChange(
      projects.map((p) =>
        p.id === projectId
          ? { ...p, bullets: p.bullets.filter((_, i) => i !== bulletIndex) }
          : p
      )
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FolderKanban className="h-5 w-5 text-primary" />
          Projects & Research
        </CardTitle>
        <Button variant="outline" size="sm" onClick={addProject}>
          <Plus className="h-4 w-4 mr-1" />
          Add Project
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {projects.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            No projects added yet. Click "Add Project" to showcase your work.
          </p>
        ) : (
          projects.map((project, index) => (
            <div key={project.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Project {index + 1}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeProject(project.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Organization/Company</Label>
                  <Input
                    placeholder="Green Hills Consortium"
                    value={project.organization}
                    onChange={(e) => updateProject(project.id, 'organization', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <Input
                    placeholder="Nov 2023 – Aug 2024"
                    value={project.date}
                    onChange={(e) => updateProject(project.id, 'date', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Project Name</Label>
                  <Input
                    placeholder="Jambo"
                    value={project.projectName}
                    onChange={(e) => updateProject(project.id, 'projectName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Your Role</Label>
                  <Input
                    placeholder="Team Member"
                    value={project.role}
                    onChange={(e) => updateProject(project.id, 'role', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Key Contributions</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addBullet(project.id)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Bullet
                  </Button>
                </div>
                {project.bullets.map((bullet, bulletIndex) => (
                  <div key={bulletIndex} className="flex gap-2">
                    <span className="mt-2 text-muted-foreground">•</span>
                    <Textarea
                      placeholder="Describe your contribution..."
                      value={bullet}
                      onChange={(e) => updateBullet(project.id, bulletIndex, e.target.value)}
                      className="min-h-[60px]"
                    />
                    {project.bullets.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeBullet(project.id, bulletIndex)}
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
