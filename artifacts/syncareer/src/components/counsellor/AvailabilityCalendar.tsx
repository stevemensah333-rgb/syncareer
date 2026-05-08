import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar, Clock, Plus, Trash2, Save, Video, Link as LinkIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TimeSlot {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface AvailabilityCalendarProps {
  counsellorId: string;
}

const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export function AvailabilityCalendar({ counsellorId }: AvailabilityCalendarProps) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [meetingLink, setMeetingLink] = useState('');
  const [counsellorDetailsId, setCounsellorDetailsId] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailability();
  }, [counsellorId]);

  const fetchAvailability = async () => {
    try {
      // Fetch meeting link from counsellor_details
      const { data: detailsData } = await supabase
        .from('counsellor_details')
        .select('id, meeting_link')
        .eq('id', counsellorId)
        .single();

      if (detailsData) {
        setCounsellorDetailsId(detailsData.id);
        setMeetingLink(detailsData.meeting_link || '');
      }

      const { data, error } = await supabase
        .from('counsellor_availability')
        .select('*')
        .eq('counsellor_id', counsellorId)
        .order('day_of_week');

      if (error) throw error;

      if (data && data.length > 0) {
        setSlots(data.map(slot => ({
          id: slot.id,
          day_of_week: slot.day_of_week,
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_available: slot.is_available,
        })));
      } else {
        // Initialize with default slots for each day
        const defaultSlots: TimeSlot[] = DAYS_OF_WEEK.map((_, idx) => ({
          day_of_week: idx,
          start_time: '09:00',
          end_time: '17:00',
          is_available: idx >= 1 && idx <= 5, // Mon-Fri default available
        }));
        setSlots(defaultSlots);
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSlot = (index: number, field: keyof TimeSlot, value: any) => {
    const newSlots = [...slots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setSlots(newSlots);
  };

  const saveAvailability = async () => {
    setSaving(true);
    try {
      // Save meeting link to counsellor_details
      if (counsellorDetailsId) {
        await supabase
          .from('counsellor_details')
          .update({ meeting_link: meetingLink || null })
          .eq('id', counsellorDetailsId);
      }

      // Delete existing slots and insert new ones
      await supabase
        .from('counsellor_availability')
        .delete()
        .eq('counsellor_id', counsellorId);

      const slotsToInsert = slots.map(slot => ({
        counsellor_id: counsellorId,
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_available: slot.is_available,
      }));

      const { error } = await supabase
        .from('counsellor_availability')
        .insert(slotsToInsert);

      if (error) throw error;

      toast.success('Availability saved successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save availability');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Availability Calendar
        </CardTitle>
        <Button onClick={saveAvailability} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Meeting Link */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Video className="h-4 w-4 text-primary" />
            Video Consultation Link
          </div>
          <div className="flex gap-2">
            <Input
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder="https://zoom.us/j/your-meeting-id or Google Meet link"
              className="flex-1"
            />
            <Button variant="outline" size="icon">
              <LinkIcon className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            This link will be shared with clients when they book a session
          </p>
        </div>

        {/* Weekly Schedule */}
        <div className="space-y-3">
          {slots.map((slot, index) => (
            <div
              key={slot.day_of_week}
              className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                slot.is_available ? 'bg-background' : 'bg-muted/30'
              }`}
            >
              <div className="w-28">
                <span className="font-medium text-sm">
                  {DAYS_OF_WEEK[slot.day_of_week]}
                </span>
              </div>
              
              <Switch
                checked={slot.is_available}
                onCheckedChange={(checked) => updateSlot(index, 'is_available', checked)}
              />
              
              {slot.is_available && (
                <div className="flex items-center gap-2 flex-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="time"
                    value={slot.start_time}
                    onChange={(e) => updateSlot(index, 'start_time', e.target.value)}
                    className="w-32"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={slot.end_time}
                    onChange={(e) => updateSlot(index, 'end_time', e.target.value)}
                    className="w-32"
                  />
                </div>
              )}
              
              {!slot.is_available && (
                <Badge variant="secondary" className="ml-2">Unavailable</Badge>
              )}
            </div>
          ))}
        </div>

        <p className="text-sm text-muted-foreground text-center">
          Set your weekly availability. Clients will only be able to book during your available hours.
        </p>
      </CardContent>
    </Card>
  );
}
