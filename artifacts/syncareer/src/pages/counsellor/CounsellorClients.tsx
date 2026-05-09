import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Search, MessageCircle, Plus, Loader2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ClientSession {
  id: string;
  booking_date: string;
  session_type: string;
  status: string;
  client_name: string;
  session_notes?: string;
}

interface ClientProfile {
  student_id: string;
  name: string;
  email: string;
  sessions_count: number;
  last_session_date?: string;
  notes?: string;
  tags: string[];
}

interface ClientNote {
  client_id: string;
  text: string;
}

export default function CounsellorClients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  const [editingNote, setEditingNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Fetch all clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);

        // Get all bookings for this counsellor
        const { data: bookings, error: bookingError } = await supabase
          .from('counsellor_bookings')
          .select(
            `
            id,
            student_id,
            booking_date,
            status,
            session_type,
            profiles:student_id (id, first_name, last_name, email)
          `
          )
          .eq('counsellor_id', user?.id)
          .order('booking_date', { ascending: false });

        if (bookingError) throw bookingError;

        // Group by student and calculate metrics
        const clientMap = new Map<string, ClientProfile>();

        bookings?.forEach((booking: any) => {
          const studentId = booking.student_id;
          const profile = booking.profiles;
          const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();

          if (!clientMap.has(studentId)) {
            clientMap.set(studentId, {
              student_id: studentId,
              name: fullName,
              email: profile.email,
              sessions_count: 0,
              last_session_date: undefined,
              notes: '',
              tags: [],
            });
          }

          const client = clientMap.get(studentId)!;
          client.sessions_count += 1;
          if (!client.last_session_date) {
            client.last_session_date = booking.booking_date;
          }
        });

        setClients(Array.from(clientMap.values()));
        setError(null);
      } catch (err) {
        console.error('[CounsellorClients] Error fetching clients:', err);
        setError(err instanceof Error ? err.message : 'Failed to load clients');
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchClients();
    }
  }, [user?.id]);

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveNote = async () => {
    if (!selectedClient) return;

    try {
      setSavingNote(true);
      // In a real app, you'd save this to a database table
      // For now, we'll just update the local state
      setClients((prev) =>
        prev.map((client) =>
          client.student_id === selectedClient.student_id
            ? { ...client, notes: editingNote }
            : client
        )
      );
      setSelectedClient((prev) =>
        prev ? { ...prev, notes: editingNote } : null
      );
    } catch (err) {
      console.error('[CounsellorClients] Error saving note:', err);
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <PageLayout title="My Clients">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-1">My Clients</h1>
          <p className="text-muted-foreground">
            Manage and track all the students you&apos;ve worked with
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Error state */}
        {error && (
          <Card className="p-4 border-destructive/50 bg-destructive/10">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-destructive">Error</p>
                <p className="text-sm text-destructive/80">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {/* Clients list */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.length === 0 ? (
              <Card className="col-span-full p-8 text-center">
                <p className="text-muted-foreground">
                  {searchTerm ? 'No clients match your search' : 'No clients yet'}
                </p>
              </Card>
            ) : (
              filteredClients.map((client) => (
                <Card key={client.student_id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    {/* Client info */}
                    <div>
                      <h3 className="font-semibold text-base line-clamp-1">{client.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {client.email}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-muted/50 p-2 rounded">
                      <div>
                        <p className="text-muted-foreground">Sessions</p>
                        <p className="font-semibold text-lg">{client.sessions_count}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last session</p>
                        <p className="font-semibold text-xs">
                          {client.last_session_date
                            ? formatDistanceToNow(new Date(client.last_session_date), {
                                addSuffix: true,
                              })
                            : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Tags */}
                    {client.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {client.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Notes preview */}
                    {client.notes && (
                      <p className="text-xs text-muted-foreground italic line-clamp-2">
                        &quot;{client.notes}&quot;
                      </p>
                    )}

                    {/* Actions */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => {
                            setSelectedClient(client);
                            setEditingNote(client.notes || '');
                          }}
                        >
                          <MessageCircle className="h-3 w-3 mr-1" />
                          View & Add Notes
                        </Button>
                      </DialogTrigger>

                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{selectedClient?.name}</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Email</p>
                              <p className="font-medium">{selectedClient?.email}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Sessions</p>
                              <p className="font-medium">{selectedClient?.sessions_count}</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                              id="notes"
                              placeholder="Add personal notes about this client..."
                              value={editingNote}
                              onChange={(e) => setEditingNote(e.target.value)}
                              className="min-h-24 text-sm"
                            />
                          </div>

                          <Button
                            onClick={handleSaveNote}
                            disabled={savingNote}
                            className="w-full"
                          >
                            {savingNote && (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            Save Notes
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
