import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Calendar, Clock, User, MessageSquare, CheckCircle, XCircle,
  Video, FileText, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { sendNotification } from '@/utils/notifications';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface Session {
  id: string;
  client_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  meeting_link: string | null;
  session_notes: string | null;
  created_at: string;
}

interface Booking {
  id: string;
  user_id: string;
  user_name: string;
  user_contact: string;
  status: string;
  created_at: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
}

interface SessionsManagerProps {
  counsellorId: string;
}

export function SessionsManager({ counsellorId }: SessionsManagerProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, [counsellorId]);

  const fetchData = async () => {
    try {
      // Fetch bookings
      const { data: bookingsData } = await supabase
        .from('counsellor_bookings')
        .select('*')
        .eq('counsellor_id', counsellorId)
        .order('created_at', { ascending: false });

      if (bookingsData) {
        setBookings(bookingsData);
      }

      // Fetch sessions
      const { data: sessionsData } = await supabase
        .from('counsellor_sessions')
        .select('*')
        .eq('counsellor_id', counsellorId)
        .order('scheduled_at', { ascending: false });

      if (sessionsData) {
        setSessions(sessionsData);
        // Initialize notes
        const notesMap: Record<string, string> = {};
        sessionsData.forEach(s => {
          notesMap[s.id] = s.session_notes || '';
        });
        setNotes(notesMap);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      // Find the booking to get user_id for notification
      const booking = bookings.find(b => b.id === bookingId);
      
      const { error } = await supabase
        .from('counsellor_bookings')
        .update({ status })
        .eq('id', bookingId);


      if (error) throw error;

      // Send notification to the user about their booking status
      if (booking) {
        const { data: counsellorData } = await supabase
          .from('counsellor_booking_view' as any)
          .select('full_name, meeting_link')
          .eq('id', counsellorId)
          .single();

        const counsellorName = counsellorData?.full_name || 'A counsellor';
        const meetingLink = counsellorData?.meeting_link;
        
        if (status === 'confirmed') {
          const meetingMsg = meetingLink
            ? ` Your session link: ${meetingLink}`
            : ' The counsellor will share a meeting link with you.';
          sendNotification({
            user_id: booking.user_id,
            type: 'booking',
            title: 'Booking Confirmed!',
            message: `${counsellorName} has confirmed your session request.${meetingMsg}`,
            category: 'booking',
            link: '/applications',
          });
        } else if (status === 'cancelled') {
          sendNotification({
            user_id: booking.user_id,
            type: 'booking',
            title: 'Booking Request Declined',
            message: `${counsellorName} was unable to accommodate your session request. Please try booking a different time.`,
            category: 'booking',
            link: '/applications',
          });
        }
      }

      setBookings(prev => prev.map(b => 
        b.id === bookingId ? { ...b, status } : b
      ));

      toast.success(`Booking ${status === 'confirmed' ? 'accepted' : 'declined'}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update booking');
    }
  };

  const saveSessionNotes = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('counsellor_sessions')
        .update({ session_notes: notes[sessionId] })
        .eq('id', sessionId);

      if (error) throw error;

      toast.success('Notes saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save notes');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-accent text-accent-foreground">Pending</Badge>;
      case 'confirmed':
        return <Badge variant="default">Confirmed</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Requests
            {pendingBookings.length > 0 && (
              <Badge variant="default" className="ml-2">{pendingBookings.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingBookings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No pending booking requests
            </p>
          ) : (
            <div className="space-y-3">
                {pendingBookings.map((booking) => (
                <div key={booking.id} className="p-4 border rounded-lg bg-accent/30">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{booking.user_name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {booking.user_contact}
                      </p>
                      {booking.scheduled_date && booking.scheduled_time && (
                        <p className="text-sm text-primary font-medium mt-1">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {new Date(booking.scheduled_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {booking.scheduled_time.slice(0, 5)}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Requested: {new Date(booking.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Decline
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmed Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {confirmedBookings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No upcoming sessions scheduled
            </p>
          ) : (
            <div className="space-y-3">
              {confirmedBookings.map((booking) => (
                <div key={booking.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{booking.user_name}</span>
                        {getStatusBadge(booking.status)}
                      </div>
                      {booking.scheduled_date && booking.scheduled_time && (
                        <p className="text-sm text-primary font-medium mt-1">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {new Date(booking.scheduled_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {booking.scheduled_time.slice(0, 5)}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        Contact: {booking.user_contact}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Video className="h-4 w-4 mr-1" />
                      Start Session
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Session Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No session history yet. Notes for completed sessions will appear here.
            </p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <Collapsible
                  key={session.id}
                  open={expandedSession === session.id}
                  onOpenChange={() => 
                    setExpandedSession(expandedSession === session.id ? null : session.id)
                  }
                >
                  <CollapsibleTrigger asChild>
                    <div className="p-4 border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {new Date(session.scheduled_at).toLocaleDateString()}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {session.duration_minutes} min
                          </span>
                          {getStatusBadge(session.status)}
                        </div>
                        {expandedSession === session.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-4 pb-4">
                    <div className="pt-4 space-y-3">
                      <Textarea
                        value={notes[session.id] || ''}
                        onChange={(e) => setNotes(prev => ({ 
                          ...prev, 
                          [session.id]: e.target.value 
                        }))}
                        placeholder="Add private notes about this session..."
                        rows={4}
                      />
                      <Button 
                        size="sm" 
                        onClick={() => saveSessionNotes(session.id)}
                      >
                        Save Notes
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
