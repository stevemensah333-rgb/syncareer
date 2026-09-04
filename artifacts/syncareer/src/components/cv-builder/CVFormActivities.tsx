import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Users, Plus, Trash2, Sparkles, Calendar, Building } from 'lucide-react';
import { ACTION_VERBS } from '@/features/cv-builder/constants';

export interface Activity {
  id: string;
  organization: string;
  activity: string;
  date: string;
  role: string;
  bullets: string[];
}

interface CVFormActivitiesProps {
  activities: Activity[];
  onChange: (activities: Activity[]) => void;
  onSuggestBullet?: (fieldPath: string, text: string) => void;
  selectedFieldPath?: string | null;
}

export const CVFormActivities: React.FC<CVFormActivitiesProps> = ({
  activities,
  onChange,
  onSuggestBullet,
  selectedFieldPath,
}) => {
  const [activeEntryId, setActiveEntryId] = useState<string | null>(activities[0]?.id ?? null);

  const addActivity = () => {
    const newId = crypto.randomUUID();
    onChange([
      ...activities,
      { id: newId, organization: '', activity: '', date: '', role: '', bullets: [''] },
    ]);
    setActiveEntryId(newId);
  };

  const updateActivity = (id: string, field: keyof Activity, value: string | string[]) => {
    onChange(activities.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  };

  const removeActivity = (id: string) => {
    onChange(activities.filter((a) => a.id !== id));
    if (activeEntryId === id) {
      setActiveEntryId(activities.find(a => a.id !== id)?.id ?? null);
    }
  };

  const addBullet = (id: string) => {
    onChange(
      activities.map((a) =>
        a.id === id ? { ...a, bullets: [...a.bullets, ''] } : a
      )
    );
  };

  const updateBullet = (activityId: string, bulletIndex: number, value: string) => {
    onChange(
      activities.map((a) =>
        a.id === activityId
          ? {
              ...a,
              bullets: a.bullets.map((b, i) => (i === bulletIndex ? value : b)),
            }
          : a
      )
    );
  };

  const removeBullet = (activityId: string, bulletIndex: number) => {
    onChange(
      activities.map((a) =>
        a.id === activityId
          ? { ...a, bullets: a.bullets.filter((_, i) => i !== bulletIndex) }
          : a
      )
    );
  };

  const insertActionVerb = (activityId: string, bulletIndex: number, verb: string) => {
    const act = activities.find(a => a.id === activityId);
    if (!act) return;
    const current = act.bullets[bulletIndex] || '';
    const capitalized = verb.charAt(0).toUpperCase() + verb.slice(1);
    const updated = current.trim() ? `${capitalized} ${current}` : `${capitalized} `;
    updateBullet(activityId, bulletIndex, updated);
  };

  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-3 px-0 pb-4 pt-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Users className="h-4 w-4 text-primary" aria-hidden="true" />
            Co-Curricular Activities & Leadership
          </CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Student associations, volunteer work, mentoring, and community initiatives.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={addActivity} className="shrink-0 rounded-control">
          <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Add activity
        </Button>
      </CardHeader>
      <CardContent className="space-y-6 px-0 pb-0 pt-0">
        {activities.length === 0 ? (
          <div className="rounded-surface border border-dashed border-border py-8 text-center">
            <Users className="mx-auto mb-2 h-7 w-7 text-muted-foreground/50" aria-hidden="true" />
            <p className="text-sm font-medium">No co-curricular activities added yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add campus clubs, leadership roles, or volunteering to highlight soft skills and initiative.
            </p>
            <Button variant="outline" size="sm" onClick={addActivity} className="mt-3 rounded-control">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add first activity
            </Button>
          </div>
        ) : (
          activities.map((activity, index) => {
            const isSelected = activeEntryId === activity.id;
            return (
              <div
                key={activity.id}
                onClick={() => setActiveEntryId(activity.id)}
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
                      {activity.activity || activity.organization ? `${activity.activity || 'Activity'} · ${activity.organization || 'Organization'}` : `Activity ${index + 1}`}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeActivity(activity.id);
                    }}
                    className="h-7 w-7 rounded-control text-muted-foreground hover:text-destructive"
                    aria-label={`Remove activity ${index + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1 text-xs font-medium">
                      <Building className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                      Organization / University Club
                    </Label>
                    <Input
                      placeholder="e.g. Ashesi Robotics Experience"
                      value={activity.organization}
                      onChange={(e) => updateActivity(activity.id, 'organization', e.target.value)}
                      className="rounded-input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Activity / Program Name</Label>
                    <Input
                      placeholder="e.g. High School STEM Outreach Program"
                      value={activity.activity}
                      onChange={(e) => updateActivity(activity.id, 'activity', e.target.value)}
                      className="rounded-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Your Leadership Role</Label>
                    <Input
                      placeholder="e.g. Lead Peer Mentor & Workshop Facilitator"
                      value={activity.role}
                      onChange={(e) => updateActivity(activity.id, 'role', e.target.value)}
                      className="rounded-input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1 text-xs font-medium">
                      <Calendar className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                      Date Range
                    </Label>
                    <Input
                      placeholder="e.g. Nov 2023 – Aug 2024"
                      value={activity.date}
                      onChange={(e) => updateActivity(activity.id, 'date', e.target.value)}
                      className="rounded-input"
                    />
                  </div>
                </div>

                {/* Bullets */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="type-label">
                      Key Contributions & Team Impact
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addBullet(activity.id)}
                      className="h-7 text-xs rounded-control"
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add bullet
                    </Button>
                  </div>

                  {activity.bullets.map((bullet, bulletIndex) => {
                    const bulletPath = `activities.${activity.id}.bullets.${bulletIndex}`;
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
                            placeholder="Describe how you collaborated, mentored peers, or organized events..."
                            value={bullet}
                            onChange={(e) => updateBullet(activity.id, bulletIndex, e.target.value)}
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
                            {activity.bullets.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeBullet(activity.id, bulletIndex)}
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
                          {ACTION_VERBS.slice(12, 18).map((verb) => (
                            <button
                              key={verb}
                              type="button"
                              onClick={() => insertActionVerb(activity.id, bulletIndex, verb)}
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
