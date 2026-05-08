import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SessionsManager } from '@/components/counsellor/SessionsManager';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card } from '@/components/ui/card';

const CounsellorSessions = () => {
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
      <PageLayout title="Sessions">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageLayout>
    );
  }

  if (!counsellorId) {
    return (
      <PageLayout title="Sessions">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Counsellor profile not found. Please complete your onboarding.</p>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Manage Sessions">
      <SessionsManager counsellorId={counsellorId} />
    </PageLayout>
  );
};

export default CounsellorSessions;
