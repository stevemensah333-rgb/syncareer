import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AvailabilityCalendar } from '@/components/counsellor/AvailabilityCalendar';
import { PageLayout } from '@/components/layout/PageLayout';

const CounsellorAvailability = () => {
  const [counsellorId, setCounsellorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCounsellorId();
  }, []);

  const fetchCounsellorId = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data } = await supabase
        .from('counsellor_details')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (data) {
        setCounsellorId(data.id);
      }
    } catch (error) {
      console.error('Error fetching counsellor ID:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="Availability">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageLayout>
    );
  }

  if (!counsellorId) {
    return (
      <PageLayout title="Availability">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Counsellor profile not found. Please complete your onboarding.</p>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Manage Availability">
      <div className="space-y-6">
        <AvailabilityCalendar counsellorId={counsellorId} />
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <Calendar className="h-8 w-8 text-primary mb-2" />
                <h4 className="font-medium">Set Your Hours</h4>
                <p className="text-sm text-muted-foreground">
                  Configure which days and times you're available for consultations
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <Users className="h-8 w-8 text-primary mb-2" />
                <h4 className="font-medium">Clients Book</h4>
                <p className="text-sm text-muted-foreground">
                  Clients can see your availability and request sessions
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <Clock className="h-8 w-8 text-primary mb-2" />
                <h4 className="font-medium">Get Notified</h4>
                <p className="text-sm text-muted-foreground">
                  You'll receive notifications when clients book sessions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default CounsellorAvailability;
