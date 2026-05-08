import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Application } from './types';

interface ScheduleInterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: Application | null;
  onSchedule: (data: {
    applicationId: string;
    scheduledAt: Date;
    interviewType: string;
    meetingLink: string;
  }) => void;
}

export function ScheduleInterviewDialog({ open, onOpenChange, application, onSchedule }: ScheduleInterviewDialogProps) {
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState('10:00');
  const [type, setType] = useState('video');
  const [meetingLink, setMeetingLink] = useState('');

  const handleSubmit = () => {
    if (!application || !date) return;
    const scheduledAt = new Date(date);
    const [hours, minutes] = time.split(':');
    scheduledAt.setHours(parseInt(hours), parseInt(minutes));

    onSchedule({
      applicationId: application.id,
      scheduledAt,
      interviewType: type,
      meetingLink,
    });

    // Reset
    setDate(undefined);
    setTime('10:00');
    setType('video');
    setMeetingLink('');
  };

  const isValid = date && !(type === 'video' && !meetingLink);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-base">Schedule Interview</DialogTitle>
          {application && (
            <p className="text-xs text-muted-foreground mt-1">
              {application.applicant?.full_name} — {application.job?.title}
            </p>
          )}
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left text-sm", !date && "text-muted-foreground")}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[60]" align="start">
                <CalendarComponent
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Time</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Video Call</SelectItem>
                  <SelectItem value="phone">Phone Call</SelectItem>
                  <SelectItem value="in-person">In Person</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">
              Meeting Link {type === 'video' ? '(required)' : '(optional)'}
            </Label>
            <Input
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder="https://meet.google.com/..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={!isValid}>Schedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
