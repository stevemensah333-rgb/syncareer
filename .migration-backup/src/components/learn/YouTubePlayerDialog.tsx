import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, ExternalLink } from 'lucide-react';

interface YouTubePlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoId: string | null;
  title: string;
  channel: string;
  duration: string;
  onMarkComplete: () => void;
  marking?: boolean;
}

const YouTubePlayerDialog: React.FC<YouTubePlayerDialogProps> = ({
  open, onOpenChange, videoId, title, channel, duration, onMarkComplete, marking,
}) => {
  if (!videoId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-base leading-tight pr-6">{title}</DialogTitle>
          <DialogDescription className="text-xs">
            {channel} · {duration} · Free
          </DialogDescription>
        </DialogHeader>

        <div className="aspect-video w-full overflow-hidden rounded-md bg-muted">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
            title={title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <Button variant="outline" size="sm" asChild>
            <a
              href={`https://www.youtube.com/watch?v=${videoId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Open on YouTube
            </a>
          </Button>
          <Button size="sm" onClick={onMarkComplete} disabled={marking}>
            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
            I've watched it — validate my skill
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default YouTubePlayerDialog;
