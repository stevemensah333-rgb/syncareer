import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import logo from '@/assets/syncareer-logo.svg';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star, Github, Globe, Award, MessageSquare, GraduationCap, Linkedin, BookOpen, Download, Mail, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { RateProjectDialog } from '@/components/portfolio/RateProjectDialog';
import { setMetaTags } from '@/lib/seo';
import { ensureFontsLoaded, getTemplate } from '@/lib/portfolioTemplates';

interface Project {
  id: string;
  title: string;
  description: string;
  project_url: string | null;
  github_url: string | null;
  tags: string[];
  is_verified: boolean;
  created_at: string;
  cover_image_url?: string | null;
  slug?: string | null;
  avgRating?: number;
  reviewCount?: number;
}

interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  linkedin_url: string | null;
}

interface SkillEndorsement { skill_name: string; count: number; }
interface StudentInfo { school: string | null; major: string; degree_type: string; expected_completion: number | null; }
interface UserSkill { skill_name: string; proficiency: string; category: string; }
interface PortfolioSettings {
  template?: string | null;
  accent_color?: string | null;
  headline?: string | null;
  subheadline?: string | null;
  contact_email?: string | null;
  available_for?: string | null;
  cv_url?: string | null;
  og_image_url?: string | null;
  external_portfolio_url?: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function PublicPortfolio() {
  const params = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [endorsements, setEndorsements] = useState<SkillEndorsement[]>([]);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [settings, setSettings] = useState<PortfolioSettings>({});
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const routeKey = params.userId ?? params.slug ?? '';
  const template = useMemo(() => getTemplate(settings.template), [settings.template]);
  const accent = settings.accent_color || '#0FB5B5';

  const fetchData = async () => {
    if (!routeKey) { navigate('/'); return; }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id || null);

      let userId: string | null = null;
      if (UUID_RE.test(routeKey)) userId = routeKey;
      else {
        const { data: byUsername } = await supabase.from('profiles').select('id').eq('username', routeKey).maybeSingle();
        userId = byUsername?.id ?? null;
      }
      if (!userId) { toast.error('Portfolio not found'); navigate('/'); return; }
      setResolvedUserId(userId);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles').select('id, username, full_name, avatar_url, bio, linkedin_url').eq('id', userId).maybeSingle();
      if (profileError || !profileData) { toast.error('User not found'); navigate('/'); return; }
      setProfile(profileData);

      const [projectsRes, endorsementsRes, studentRes, skillsRes, settingsRes] = await Promise.all([
        supabase.from('portfolio_projects').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('skill_endorsements').select('skill_name').eq('user_id', userId),
        supabase.from('student_details').select('school, major, degree_type, expected_completion').eq('user_id', userId).maybeSingle(),
        supabase.from('user_skills' as any).select('skill_name, proficiency, category').eq('user_id', userId),
        supabase.from('portfolio_settings' as any).select('*').eq('user_id', userId).maybeSingle(),
      ]);

      if (settingsRes.data) setSettings(settingsRes.data as any);

      const projectIds = (projectsRes.data || []).map(p => p.id);
      let reviewsByProject: Record<string, number[]> = {};
      if (projectIds.length > 0) {
        const { data: reviewsData } = await supabase.from('portfolio_reviews').select('project_id, rating').in('project_id', projectIds);
        (reviewsData || []).forEach(r => {
          if (!reviewsByProject[r.project_id]) reviewsByProject[r.project_id] = [];
          reviewsByProject[r.project_id].push(r.rating);
        });
      }
      setProjects((projectsRes.data || []).map(p => ({
        ...p,
        tags: p.tags ?? [],
        is_verified: p.is_verified ?? false,
        avgRating: reviewsByProject[p.id] ? reviewsByProject[p.id].reduce((a,b)=>a+b,0)/reviewsByProject[p.id].length : 0,
        reviewCount: reviewsByProject[p.id]?.length ?? 0,
      })) as any);

      const counts: Record<string, number> = {};
      (endorsementsRes.data || []).forEach(e => { counts[e.skill_name] = (counts[e.skill_name] || 0) + 1; });
      setEndorsements(Object.entries(counts).map(([skill_name, count]) => ({ skill_name, count })).sort((a,b)=>b.count-a.count));

      if (studentRes.data && !studentRes.error) setStudentInfo(studentRes.data as StudentInfo);
      if (skillsRes.data && !skillsRes.error) setUserSkills((skillsRes.data as any[]) || []);

      // Record an analytics view (skip if owner is viewing own portfolio)
      if (session?.user?.id !== userId) {
        supabase.from('portfolio_views' as any).insert({
          owner_user_id: userId,
          viewer_user_id: session?.user?.id ?? null,
          referrer: document.referrer || null,
        }).then(() => {});
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      toast.error('Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [routeKey]);

  // SEO + fonts when profile/settings ready
  useEffect(() => {
    if (!profile) return;
    ensureFontsLoaded(template);
    const displayName = profile.full_name || profile.username || 'Portfolio';
    const desc = settings.subheadline || profile.bio || `${displayName}'s public portfolio on Syncareer.`;
    setMetaTags({
      title: `${displayName} · Syncareer Portfolio`,
      description: desc.slice(0, 160),
      ogTitle: settings.headline || displayName,
      ogDescription: desc.slice(0, 160),
      ogImage: settings.og_image_url || projects[0]?.cover_image_url || profile.avatar_url || undefined,
      ogUrl: window.location.href,
      twitterCard: 'summary_large_image',
      canonical: window.location.href,
    });
  }, [profile, settings, template, projects]);

  const handleRateProject = (project: Project) => { setSelectedProject(project); setRatingDialogOpen(true); };

  const getProjectEmoji = (tags: string[]) => {
    const tagLower = tags[0]?.toLowerCase() || '';
    if (tagLower.includes('react') || tagLower.includes('vue')) return '⚛️';
    if (tagLower.includes('node') || tagLower.includes('backend')) return '🖥️';
    if (tagLower.includes('mobile')) return '📱';
    if (tagLower.includes('data')) return '📊';
    if (tagLower.includes('design')) return '🎨';
    if (tagLower.includes('game')) return '🎮';
    return '💼';
  };

  const getProficiencyColor = (p: string) => {
    switch (p.toLowerCase()) {
      case 'expert': return 'bg-green-100 text-green-700 border-green-200';
      case 'advanced': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'intermediate': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }
  if (!profile) return null;

  // External wrap mode: render iframe with thin Syncareer chrome
  if (settings.external_portfolio_url) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="border-b border-border bg-background h-12 flex items-center px-4 justify-between flex-shrink-0">
          <Link to="/" className="flex items-center gap-2"><img src={logo} alt="Syncareer" className="h-6" /></Link>
          <div className="flex items-center gap-3">
            {settings.cv_url && (
              <a href={settings.cv_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                <Download className="h-4 w-4" /> CV
              </a>
            )}
            <Link to={`/u/${profile.username || profile.id}?syncareer=1`} className="text-sm font-medium text-muted-foreground hover:underline">Syncareer profile</Link>
            <Link to="/auth" className="text-sm font-medium text-primary hover:underline">Build your own</Link>
          </div>
        </header>
        <iframe
          src={settings.external_portfolio_url}
          className="flex-1 w-full border-0"
          title={`${profile.full_name || profile.username}'s portfolio`}
        />
      </div>
    );
  }

  const displayName = profile.full_name || profile.username || 'Anonymous';
  const totalEndorsements = endorsements.reduce((sum, e) => sum + e.count, 0);
  const ownerKey = profile.username || profile.id;
  const projectHref = (p: Project) => `/${profile.username ? `u/${profile.username}` : `portfolio/${profile.id}`}/p/${p.slug || p.id}`;

  const accentStyle = { ['--portfolio-accent' as any]: accent } as React.CSSProperties;
  const headingStyle = { fontFamily: `'${template.headingFont}', system-ui, sans-serif` };
  const bodyStyle = { fontFamily: `'${template.bodyFont}', system-ui, sans-serif` };

  return (
    <div className={`min-h-screen ${template.wrapperClass}`} style={{ ...accentStyle, ...bodyStyle }}>
      <header className={`bg-inherit/80 backdrop-blur sticky top-0 z-10 ${template.heroClass}`}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2"><img src={logo} alt="Syncareer" className="h-7 w-auto" /></Link>
          <div className="flex items-center gap-4">
            {settings.cv_url && (
              <a href={settings.cv_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline flex items-center gap-1" style={{ color: accent }}>
                <Download className="h-4 w-4" /> Download CV
              </a>
            )}
            <Link to="/auth" className="text-sm font-medium hover:underline" style={{ color: accent }}>Build your own</Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Hero */}
        <section className="mb-10">
          <div className="flex items-start gap-6 flex-wrap">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-2xl">{displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-[260px]">
              <h1 className="text-3xl md:text-4xl font-bold mb-1" style={headingStyle}>{displayName}</h1>
              {settings.headline && <p className="text-xl mb-2" style={{ color: accent }}>{settings.headline}</p>}
              {settings.subheadline ? (
                <p className="opacity-80 mb-3">{settings.subheadline}</p>
              ) : profile.bio ? (
                <p className="opacity-80 mb-3">{profile.bio}</p>
              ) : null}

              {studentInfo && (
                <div className="flex items-center gap-2 text-sm opacity-70 mb-2 flex-wrap">
                  <GraduationCap className="h-4 w-4" />
                  <span>{studentInfo.degree_type} in {studentInfo.major}</span>
                  {studentInfo.school && <><span>•</span><span>{studentInfo.school}</span></>}
                  {studentInfo.expected_completion && <><span>•</span><span>Expected {studentInfo.expected_completion}</span></>}
                </div>
              )}

              <div className="flex flex-wrap gap-2 mt-3">
                {profile.linkedin_url && (
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open(profile.linkedin_url!, '_blank')}>
                    <Linkedin className="h-4 w-4" /> LinkedIn
                  </Button>
                )}
                {settings.contact_email && (
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open(`mailto:${settings.contact_email}`, '_self')}>
                    <Mail className="h-4 w-4" /> Contact
                  </Button>
                )}
                {settings.cv_url && (
                  <Button size="sm" className="gap-2" style={{ backgroundColor: accent, color: '#fff' }} onClick={() => window.open(settings.cv_url!, '_blank')}>
                    <Download className="h-4 w-4" /> Download CV
                  </Button>
                )}
              </div>

              {settings.available_for && (
                <p className="mt-3 text-sm inline-block px-2 py-1 rounded" style={{ backgroundColor: `${accent}1A`, color: accent }}>
                  Available for: {settings.available_for}
                </p>
              )}
            </div>
            <div className="flex items-center gap-6 text-center">
              <div><p className="text-2xl font-bold">{projects.length}</p><p className="text-xs opacity-60">Projects</p></div>
              <div><p className="text-2xl font-bold">{totalEndorsements}</p><p className="text-xs opacity-60">Endorsements</p></div>
              <div><p className="text-2xl font-bold">{userSkills.length || endorsements.length}</p><p className="text-xs opacity-60">Skills</p></div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Projects */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold" style={headingStyle}>Projects</h2>
            {projects.length === 0 ? (
              <Card><CardContent className="pt-6 text-center opacity-60">No projects yet.</CardContent></Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {projects.map((project) => (
                  <Card key={project.id} className={template.cardClass}>
                    {project.cover_image_url && (
                      <Link to={projectHref(project)}>
                        <img src={project.cover_image_url} alt={project.title} className="w-full h-36 object-cover rounded-t-lg" />
                      </Link>
                    )}
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        {!project.cover_image_url && <div className="text-3xl mb-2">{getProjectEmoji(project.tags)}</div>}
                        <div className="flex items-center gap-2 ml-auto">
                          {(project.reviewCount ?? 0) > 0 && (
                            <div className="flex items-center gap-1 text-sm">
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                              <span className="font-medium">{project.avgRating?.toFixed(1)}</span>
                              <span className="opacity-60">({project.reviewCount})</span>
                            </div>
                          )}
                          {project.is_verified && <Badge variant="secondary" className="gap-1"><Award className="h-3 w-3" />Verified</Badge>}
                        </div>
                      </div>
                      <CardTitle className="text-lg" style={headingStyle}>
                        <Link to={projectHref(project)} className="hover:underline">{project.title}</Link>
                      </CardTitle>
                      <p className="text-sm opacity-70 line-clamp-2">{project.description}</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {project.tags.map((tag) => (<Badge key={tag} variant="outline">{tag}</Badge>))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link to={projectHref(project)}>
                          <Button size="sm" variant="outline"><ExternalLink className="h-4 w-4 mr-1" />Case study</Button>
                        </Link>
                        {project.project_url && (
                          <Button size="sm" variant="outline" onClick={() => window.open(project.project_url!, '_blank')}><Globe className="h-4 w-4 mr-1" /> Demo</Button>
                        )}
                        {project.github_url && (
                          <Button size="sm" variant="outline" onClick={() => window.open(project.github_url!, '_blank')}><Github className="h-4 w-4 mr-1" /> Code</Button>
                        )}
                        {currentUserId && currentUserId !== resolvedUserId && (
                          <Button size="sm" variant="secondary" onClick={() => handleRateProject(project)}><MessageSquare className="h-4 w-4 mr-1" /> Rate</Button>
                        )}
                      </div>
                      <p className="text-xs opacity-60">Added {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {userSkills.length > 0 && (
              <>
                <h2 className="text-xl font-semibold flex items-center gap-2" style={headingStyle}><BookOpen className="h-5 w-5" /> Skills</h2>
                <Card className={template.cardClass}>
                  <CardContent className="pt-6 space-y-2">
                    {userSkills.map((skill) => (
                      <div key={skill.skill_name} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{skill.skill_name}</span>
                        <Badge variant="outline" className={getProficiencyColor(skill.proficiency)}>{skill.proficiency}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}

            <h2 className="text-xl font-semibold" style={headingStyle}>Endorsements</h2>
            {endorsements.length === 0 ? (
              <Card className={template.cardClass}><CardContent className="pt-6 text-center opacity-60">No endorsements yet.</CardContent></Card>
            ) : (
              <Card className={template.cardClass}>
                <CardContent className="pt-6 space-y-3">
                  {endorsements.map((e) => (
                    <div key={e.skill_name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><Star className="h-4 w-4" style={{ color: accent, fill: accent }} /><span className="font-medium">{e.skill_name}</span></div>
                      <Badge variant="secondary">{e.count}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {selectedProject && (
          <RateProjectDialog
            open={ratingDialogOpen}
            onOpenChange={setRatingDialogOpen}
            projectId={selectedProject.id}
            projectTitle={selectedProject.title}
            onRatingSubmitted={fetchData}
          />
        )}
      </main>
    </div>
  );
}
