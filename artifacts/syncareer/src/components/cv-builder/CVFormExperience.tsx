import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Briefcase, Plus, Trash2, Sparkles, MapPin, Calendar } from 'lucide-react';
import { ACTION_VERBS } from '@/features/cv-builder/constants';

export interface Experience {
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
  onSuggestBullet?: (fieldPath: string, text: string) => void;
  selectedFieldPath?: string | null;
}

export const CVFormExperience: React.FC<CVFormExperienceProps> = ({
  experience,
  onChange,
  onSuggestBullet,
  selectedFieldPath,
}) => {
  const [activeEntryId, setActiveEntryId] = useState<string | null>(experience[0]?.id ?? null);

  const addExperience = () => {
    const newId = crypto.randomUUID();
    onChange([
      ...experience,
      { id: newId, company: '', location: '', date: '', role: '', bullets: [''] },
    ]);
    setActiveEntryId(newId);
  };

  const updateExperience = (id: string, field: keyof Experience, value: string | string[]) => {
    onChange(experience.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const removeExperience = (id: string) => {
    onChange(experience.filter((e) => e.id !== id));
    if (activeEntryId === id) {
      setActiveEntryId(experience.find(e => e.id !== id)?.id ?? null);
    }
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

  const insertActionVerb = (expId: string, bulletIndex: number, verb: string) => {
    const exp = experience.find(e => e.id === expId);
    if (!exp) return;
    const current = exp.bullets[bulletIndex] || '';
    const capitalized = verb.charAt(0).toUpperCase() + verb.slice(1);
    const updated = current.trim() ? `${capitalized} ${current}` : `${capitalized} `;
    updateBullet(expId, bulletIndex, updated);
  };

  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Briefcase className="h-4 w-4 text-primary" aria-hidden="true" />
            Work Experience & Internships
          </CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Include full-time roles, part-time jobs, and internships showing evidence of impact.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={addExperience} className="shrink-0 rounded-control">
          <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Add role
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {experience.length === 0 ? (
          <div className="rounded-surface border border-dashed border-border py-8 text-center">
            <Briefcase className="mx-auto mb-2 h-7 w-7 text-muted-foreground/50" aria-hidden="true" />
            <p className="text-sm font-medium">No work experience added yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add internships, student jobs, or relevant employment to demonstrate capability.
            </p>
            <Button variant="outline" size="sm" onClick={addExperience} className="mt-3 rounded-control">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add first experience
            </Button>
          </div>
        ) : (
          experience.map((exp, index) => {
            const isSelected = activeEntryId === exp.id;
            return (
              <div
                key={exp.id}
                onClick={() => setActiveEntryId(exp.id)}
                className={`rounded-surface border p-4 sm:p-5 space-y-4 transition-all duration-150 ${
                  isSelected
                    ? 'border-primary/50 bg-card shadow-sm ring-1 ring-primary/20'
                    : 'border-border bg-card hover:border-border/80'
                }`}
              >
                <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="grid h-6 w-6 place-items-center rounded-control bg-secondary text-xs font-semibold text-secondary-foreground">
                      {index + 1}
                    </span>
                    <span className="truncate text-sm font-semibold text-foreground">
                      {exp.role || exp.company ? `${exp.role || 'Role'} · ${exp.company || 'Company'}` : `Experience ${index + 1}`}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeExperience(exp.id);
                    }}
                    className="h-7 w-7 rounded-control text-muted-foreground hover:text-destructive"
                    aria-label={`Remove experience ${index + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Company / Organization</Label>
                    <Input
                      placeholder="e.g. Standard Chartered Bank"
                      value={exp.company}
                      onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                      className="rounded-input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1 text-xs font-medium">
                      <MapPin className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                      Location
                    </Label>
                    <Input
                      placeholder="e.g. Accra, Ghana (or Remote)"
                      value={exp.location}
                      onChange={(e) => updateExperience(exp.id, 'location', e.target.value)}
                      className="rounded-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Role / Position Title</Label>
                    <Input
                      placeholder="e.g. Financial Analyst Intern"
                      value={exp.role}
                      onChange={(e) => updateExperience(exp.id, 'role', e.target.value)}
                      className="rounded-input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1 text-xs font-medium">
                      <Calendar className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                      Date Range
                    </Label>
                    <Input
                      placeholder="e.g. May 2024 – Aug 2024"
                      value={exp.date}
                      onChange={(e) => updateExperience(exp.id, 'date', e.target.value)}
                      className="rounded-input"
                    />
                  </div>
                </div>

                {/* Bullets */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="type-label">
                      Key Responsibilities & Measurable Impact
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addBullet(exp.id)}
                      className="h-7 text-xs rounded-control"
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add bullet
                    </Button>
                  </div>

                  {exp.bullets.map((bullet, bulletIndex) => {
                    const bulletPath = `experience.${exp.id}.bullets.${bulletIndex}`;
                    const isBulletSelected = selectedFieldPath === bulletPath;
                    return (
                      <div
                        key={bulletIndex}
                        className={`group relative rounded-surface border p-2.5 transition-colors ${
                          isBulletSelected ? 'border-primary bg-primary/5' : 'border-border bg-card'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                          <Textarea
                            placeholder="Start with an action verb (e.g. Spearheaded, Built, Optimized) and quantify the outcome..."
                            value={bullet}
                            onChange={(e) => updateBullet(exp.id, bulletIndex, e.target.value)}
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
                            {exp.bullets.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeBullet(exp.id, bulletIndex)}
                                className="h-7 w-7 rounded-control text-muted-foreground hover:text-destructive"
                                aria-label={`Remove bullet ${bulletIndex + 1}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Quick action verbs assist */}
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
                          <span className="font-medium text-xs">Action verbs:</span>
                          {ACTION_VERBS.slice(0, 6).map((verb) => (
                            <button
                              key={verb}
                              type="button"
                              onClick={() => insertActionVerb(exp.id, bulletIndex, verb)}
                              className="rounded-control bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-secondary-foreground hover:bg-primary/15 hover:text-primary transition-colors"
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
