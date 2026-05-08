import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Users, Plus, Trash2 } from 'lucide-react';

interface Activity {
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
}

export const CVFormActivities: React.FC<CVFormActivitiesProps> = ({ activities, onChange }) => {
  const addActivity = () => {
    onChange([
      ...activities,
      { id: crypto.randomUUID(), organization: '', activity: '', date: '', role: '', bullets: [''] },
    ]);
  };

  const updateActivity = (id: string, field: keyof Activity, value: string | string[]) => {
    onChange(activities.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  };

  const removeActivity = (id: string) => {
    onChange(activities.filter((a) => a.id !== id));
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Co-Curricular Activities
        </CardTitle>
        <Button variant="outline" size="sm" onClick={addActivity}>
          <Plus className="h-4 w-4 mr-1" />
          Add Activity
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {activities.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            No activities added yet. Click "Add Activity" to include your extracurriculars.
          </p>
        ) : (
          activities.map((activity, index) => (
            <div key={activity.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Activity {index + 1}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeActivity(activity.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Organization</Label>
                  <Input
                    placeholder="Ashesi University College"
                    value={activity.organization}
                    onChange={(e) => updateActivity(activity.id, 'organization', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Activity/Club Name</Label>
                  <Input
                    placeholder="Ashesi Robotics Experience"
                    value={activity.activity}
                    onChange={(e) => updateActivity(activity.id, 'activity', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Your Role</Label>
                  <Input
                    placeholder="Mentor"
                    value={activity.role}
                    onChange={(e) => updateActivity(activity.id, 'role', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <Input
                    placeholder="Nov 2023 – Aug 2024"
                    value={activity.date}
                    onChange={(e) => updateActivity(activity.id, 'date', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Key Responsibilities</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addBullet(activity.id)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Bullet
                  </Button>
                </div>
                {activity.bullets.map((bullet, bulletIndex) => (
                  <div key={bulletIndex} className="flex gap-2">
                    <span className="mt-2 text-muted-foreground">•</span>
                    <Textarea
                      placeholder="Describe your contribution..."
                      value={bullet}
                      onChange={(e) => updateBullet(activity.id, bulletIndex, e.target.value)}
                      className="min-h-[60px]"
                    />
                    {activity.bullets.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeBullet(activity.id, bulletIndex)}
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
