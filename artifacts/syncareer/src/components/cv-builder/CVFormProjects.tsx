import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FolderKanban, Plus, Trash2, Sparkles, Calendar, Building2 } from 'lucide-react';
import { ACTION_VERBS } from '@/features/cv-builder/constants';

export interface Project {
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
  onSuggestBullet?: (fieldPath: string, text: string) => void;
  selectedFieldPath?: string | null;
}

export const CVFormProjects: React.FC<CVFormProjectsProps> = ({
  projects,
  onChange,
  onSuggestBullet,
  selectedFieldPath,
}) => {
  const [activeEntryId, setActiveEntryId] = useState<string | null>(projects[0]?.id ?? null);

  const addProject = () => {
    const newId = crypto.randomUUID();
    onChange([
      ...projects,
      { id: newId, organization: '', date: '', projectName: '', role: '', bullets: [''] },
    ]);
    setActiveEntryId(newId);
  };

  const updateProject = (id: string, field: keyof Project, value: string | string[]) => {
    onChange(projects.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const removeProject = (id: string) => {
    onChange(projects.filter((p) => p.id !== id));
    if (activeEntryId === id) {
      setActiveEntryId(projects.find(p => p.id !== id)?.id ?? null);
    }
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

  const insertActionVerb = (projectId: string, bulletIndex: number, verb: string) => {
    const proj = projects.find(p => p.id === projectId);
    if (!proj) return;
    const current = proj.bullets[bulletIndex] || '';
    const capitalized = verb.charAt(0).toUpperCase() + verb.slice(1);
    const updated = current.trim() ? `${capitalized} ${current}` : `${capitalized} `;
    updateBullet(projectId, bulletIndex, updated);
  };

  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-3 px-0 pb-4 pt-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <FolderKanban className="h-4 w-4 text-primary" aria-hidden="true" />
            Projects & Research
          </CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Academic projects, open-source work, capstone research, and independent initiatives.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={addProject} className="shrink-0 rounded-control">
          <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Add project
        </Button>
      </CardHeader>
      <CardContent className="space-y-6 px-0 pb-0 pt-0">
        {projects.length === 0 ? (
          <div className="rounded-surface border border-dashed border-border py-8 text-center">
            <FolderKanban className="mx-auto mb-2 h-7 w-7 text-muted-foreground/50" aria-hidden="true" />
            <p className="text-sm font-medium">No projects added yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add technical projects or coursework to demonstrate hands-on application of skills.
            </p>
            <Button variant="outline" size="sm" onClick={addProject} className="mt-3 rounded-control">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add first project
            </Button>
          </div>
        ) : (
          projects.map((project, index) => {
            const isSelected = activeEntryId === project.id;
            return (
              <div
                key={project.id}
                onClick={() => setActiveEntryId(project.id)}
                className={`rounded-control border p-4 sm:p-5 space-y-4 transition-all duration-150 ${
                  isSelected
                    ? 'border-primary/40 bg-selected/70 shadow-none'
                    : 'border-border bg-transparent hover:border-primary/20'
                }`}
              >
                <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="grid h-6 w-6 place-items-center rounded-control bg-secondary text-xs font-semibold text-secondary-foreground">
                      {index + 1}
                    </span>
                    <span className="truncate text-sm font-semibold text-foreground">
                      {project.projectName || project.organization ? `${project.projectName || 'Project'} · ${project.organization || 'Org'}` : `Project ${index + 1}`}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeProject(project.id);
                    }}
                    className="h-7 w-7 rounded-control text-muted-foreground hover:text-destructive"
                    aria-label={`Remove project ${index + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Project Name / Title</Label>
                    <Input
                      placeholder="e.g. Automated Crop Disease Detection System"
                      value={project.projectName}
                      onChange={(e) => updateProject(project.id, 'projectName', e.target.value)}
                      className="rounded-input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1 text-xs font-medium">
                      <Building2 className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                      Affiliation / Course / Client
                    </Label>
                    <Input
                      placeholder="e.g. Computer Vision Lab / Ashesi Capstone"
                      value={project.organization}
                      onChange={(e) => updateProject(project.id, 'organization', e.target.value)}
                      className="rounded-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Your Role / Contribution</Label>
                    <Input
                      placeholder="e.g. Lead Machine Learning Developer"
                      value={project.role}
                      onChange={(e) => updateProject(project.id, 'role', e.target.value)}
                      className="rounded-input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1 text-xs font-medium">
                      <Calendar className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                      Date Range
                    </Label>
                    <Input
                      placeholder="e.g. Jan 2024 – May 2024"
                      value={project.date}
                      onChange={(e) => updateProject(project.id, 'date', e.target.value)}
                      className="rounded-input"
                    />
                  </div>
                </div>

                {/* Bullets */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="type-label">
                      Key Technical Objectives, Tools Used & Results
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addBullet(project.id)}
                      className="h-7 text-xs rounded-control"
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add bullet
                    </Button>
                  </div>

                  {project.bullets.map((bullet, bulletIndex) => {
                    const bulletPath = `projects.${project.id}.bullets.${bulletIndex}`;
                    const isBulletSelected = selectedFieldPath === bulletPath;
                    return (
                      <div
                        key={bulletIndex}
                        className={`group relative rounded-control border p-2.5 transition-colors ${
                          isBulletSelected ? 'border-primary bg-primary/5' : 'border-border bg-secondary/20'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                          <Textarea
                            placeholder="Describe architecture, technologies used (e.g. PyTorch, React), and measurable performance metrics..."
                            value={bullet}
                            onChange={(e) => updateBullet(project.id, bulletIndex, e.target.value)}
                            className="min-h-[58px] flex-1 resize-y border-none bg-transparent p-1 text-sm shadow-none focus-visible:ring-0"
                          />
                          <div className="flex shrink-0 items-center gap-1">
                            {onSuggestBullet && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => onSuggestBullet(bulletPath, bullet)}
                                className="h-7 px-2 text-xs text-primary hover:bg-primary/10 rounded-control"
                                title="Get a suggested rewrite"
                              >
                                <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
                                Improve
                              </Button>
                            )}
                            {project.bullets.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeBullet(project.id, bulletIndex)}
                                className="h-7 w-7 rounded-control text-muted-foreground hover:text-destructive"
                                aria-label={`Remove bullet ${bulletIndex + 1}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
                          <span className="font-medium text-xs">Action verbs:</span>
                          {ACTION_VERBS.slice(6, 12).map((verb) => (
                            <button
                              key={verb}
                              type="button"
                              onClick={() => insertActionVerb(project.id, bulletIndex, verb)}
                              className="rounded-control border border-border bg-transparent px-1.5 py-0.5 text-[11px] font-medium text-secondary-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                            >
                              +{verb}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
