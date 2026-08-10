import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Copy, ExternalLink, Loader2, AlertCircle } from 'lucide-react';

interface MeetingLinkDisplayProps {
  counsellorId: string;
  sessionTitle?: string;
}

interface CounsellorDetails {
  meeting_platform?: string;
  meeting_link?: string;
}

export function MeetingLinkDisplay({ counsellorId, sessionTitle }: MeetingLinkDisplayProps) {
  const [details, setDetails] = useState<CounsellorDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchMeetingLink = async () => {
      try {
        const { data, error } = await supabase
          .from('counsellor_details')
          .select('meeting_platform, meeting_link')
          .eq('id', counsellorId)
          .single();

        if (error) throw error;
        setDetails(data as CounsellorDetails | null);
      } catch (error) {
        console.error('[MeetingLinkDisplay] Error fetching meeting link:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMeetingLink();
  }, [counsellorId]);

  const handleCopyLink = async () => {
    if (!details?.meeting_link) return;

    try {
      await navigator.clipboard.writeText(details.meeting_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('[MeetingLinkDisplay] Failed to copy:', error);
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center h-20">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (!details?.meeting_link) {
    return (
      <Card className="p-4 border-dashed">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">No meeting link configured</p>
            <p>The counsellor hasn&apos;t set up a meeting link yet.</p>
          </div>
        </div>
      </Card>
    );
  }

  const platformIcons: Record<string, string> = {
    zoom: '🎥',
    google_meet: '🟢',
    teams: '💙',
    custom: '🔗',
  };

  const platformNames: Record<string, string> = {
    zoom: 'Zoom',
    google_meet: 'Google Meet',
    teams: 'Microsoft Teams',
    custom: 'Custom Platform',
  };

  return (
    <Card className="p-4 bg-blue-50 border-blue-200">
      <div className="space-y-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">
              {platformIcons[details.meeting_platform || 'custom']}
            </span>
            <h4 className="font-semibold text-sm">
              {platformNames[details.meeting_platform || 'custom']} Session
            </h4>
          </div>
          {sessionTitle && (
            <p className="text-xs text-muted-foreground">Session: {sessionTitle}</p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Meeting Link:</p>
          <div className="flex gap-2 items-center">
            <a
              href={details.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline truncate flex-1"
            >
              {details.meeting_link}
            </a>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleCopyLink}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            <Copy className="h-3 w-3 mr-1" />
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>

          <a href={details.meeting_link} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="text-xs">
              <ExternalLink className="h-3 w-3 mr-1" />
              Open Meeting
            </Button>
          </a>
        </div>
      </div>
    </Card>
  );
}
