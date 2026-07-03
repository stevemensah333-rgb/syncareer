import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, BookOpen, Briefcase, Target, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { HardSkill } from '@/hooks/useMarketIntelligence';

interface Props {
  topSkills: HardSkill[];
  major: string;
}

/**
 * Prescriptive hero: compares the user's skills against the top in-demand
 * skills for their major and turns it into an action plan with concrete
 * next steps in Learn (close gaps) and Apply (matching jobs).
 */
export const PrescriptiveActionPlan: React.FC<Props> = ({ topSkills, major }) => {
  const navigate = useNavigate();
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoaded(true); return; }
      const { data } = await supabase
        .from('user_skills')
        .select('skill_name')
        .eq('user_id', user.id);
      setUserSkills((data || []).map(s => s.skill_name.toLowerCase()));
      setLoaded(true);
    })();
  }, []);

  if (!loaded || topSkills.length === 0) return null;

  const top5 = topSkills.slice(0, 5);
  const have = top5.filter(s => userSkills.some(u => u.includes(s.skill.toLowerCase()) || s.skill.toLowerCase().includes(u)));
  const missing = top5.filter(s => !have.includes(s));
  const readiness = Math.round((have.length / top5.length) * 100);

  return (
    <Card className="border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent overflow-hidden">
      <CardContent className="p-6 md:p-8 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-2">Your action plan</p>
            <h2 className="font-serif text-2xl md:text-3xl font-normal leading-tight tracking-[-0.02em] text-foreground">
              You're <span className="italic text-primary">{readiness}% ready</span> for {major} roles
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Based on the top 5 most-demanded skills in this market right now.
            </p>
          </div>
          <Badge
            variant="outline"
            className={
              readiness >= 80 ? 'border-green-500 text-green-600' :
              readiness >= 50 ? 'border-primary text-primary' :
              'border-amber-500 text-amber-600'
            }
          >
            {have.length} of {top5.length} skills
          </Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Have */}
          <div className="rounded-lg border bg-background/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <p className="text-sm font-semibold">Skills you have</p>
            </div>
            {have.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {have.map(s => (
                  <Badge key={s.skill} className="bg-green-100 text-green-700 hover:bg-green-100 border-0 text-xs">
                    {s.skill}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Add your skills in Build → CV to see what you already have.
              </p>
            )}
          </div>

          {/* Missing */}
          <div className="rounded-lg border bg-background/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-semibold">Skills to close</p>
            </div>
            {missing.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {missing.map(s => (
                  <Badge key={s.skill} variant="outline" className="border-amber-500/40 text-amber-700 text-xs">
                    {s.skill}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">You cover the top 5. Aim for the next tier below.</p>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button variant="outline" onClick={() => navigate('/apply')} className="gap-2">
            <Briefcase className="h-4 w-4" />
            See matching jobs
          </Button>
        </div>

      </CardContent>
    </Card>
  );
};
