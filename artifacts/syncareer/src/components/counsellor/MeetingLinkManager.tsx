import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export type MeetingPlatform = 'zoom' | 'google_meet' | 'teams' | 'custom';

interface MeetingLinkManagerProps {
  onSave?: () => void;
}

export function MeetingLinkManager({ onSave }: MeetingLinkManagerProps) {
  const { userId } = useAuth();
  const [platform, setPlatform] = useState<MeetingPlatform>('zoom');
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (!link.trim()) {
      setError('Please enter a meeting link');
      return;
    }

    if (!link.startsWith('http')) {
      setError('Please enter a valid URL (must start with http or https)');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('counsellor_details')
        .update({
          meeting_platform: platform,
          meeting_link: link,
        })
        .eq('user_id', userId ?? '');

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onSave?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save meeting link');
    } finally {
      setLoading(false);
    }
  };

  const platformLabels: Record<MeetingPlatform, string> = {
    zoom: 'Zoom',
    google_meet: 'Google Meet',
    teams: 'Microsoft Teams',
    custom: 'Custom Link',
  };

  const platformPlaceholders: Record<MeetingPlatform, string> = {
    zoom: 'https://zoom.us/j/123456789',
    google_meet: 'https://meet.google.com/abc-defg-hij',
    teams: 'https://teams.microsoft.com/l/meetup-join/19:meeting@thread.v2',
    custom: 'https://your-meeting-platform.com/room/xyz',
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg mb-2">Meeting Link Settings</h3>
          <p className="text-sm text-muted-foreground">
            Configure where your sessions will take place. This link will be shared with students.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-600">Meeting link saved successfully!</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="platform">Platform</Label>
          <Select value={platform} onValueChange={(value) => setPlatform(value as MeetingPlatform)}>
            <SelectTrigger id="platform">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(platformLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="meeting-link">Meeting Link</Label>
          <Input
            id="meeting-link"
            placeholder={platformPlaceholders[platform]}
            value={link}
            onChange={(e) => setLink(e.target.value)}
            disabled={loading}
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Enter the full URL to your meeting room or account
          </p>
        </div>

        <Button onClick={handleSave} disabled={loading || !link.trim()}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {loading ? 'Saving...' : 'Save Meeting Link'}
        </Button>
      </div>
    </Card>
  );
}
