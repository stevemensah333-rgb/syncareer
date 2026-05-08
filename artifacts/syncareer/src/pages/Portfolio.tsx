import React, { useState, useEffect, useMemo } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import CachedDataIndicator, { OfflineEmptyState } from '@/components/CachedDataIndicator';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Upload, ExternalLink, Trash2, Linkedin, Save, LineChart, Copy, CheckCircle } from 'lucide-react';
import { UploadProjectDialog } from '@/components/portfolio/UploadProjectDialog';
import ProfileSummaryCard from '@/components/portfolio/ProfileSummaryCard';
import { WhatsAppShareButton } from '@/components/shared/WhatsAppShareButton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

interface Project {
  id: string;
  title: string;
  description: string;
  project_url: string | null;
  github_url: string | null;
  tags: string[];
  is_verified: boolean;
  created_at: string;
  user_id: string;
}

const Portfolio = () => {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [savingLinkedin, setSavingLinkedin] = useState(false);
  const [profileData, setProfileData] = useState<{ bio: string | null; full_name: string | null } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }
      
      setCurrentUserId(session.user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('linkedin_url, bio, full_name')
        .eq('id', session.user.id)
        .maybeSingle();
      
      if (profile) {
        if (profile.linkedin_url) setLinkedinUrl(profile.linkedin_url);
        setProfileData({ bio: profile.bio, full_name: profile.full_name });
      }

      const { data: projectsData, error: projectsError } = await supabase
        .from('portfolio_projects')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;
      setProjects((projectsData || []) as any);
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
      toast.error('Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('portfolio_projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
      setProjects(projects.filter(p => p.id !== projectId));
      toast.success('Project deleted');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    }
  };

  const saveLinkedinUrl = async () => {
    if (!currentUserId) return;
    setSavingLinkedin(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ linkedin_url: linkedinUrl || null })
        .eq('id', currentUserId);

      if (error) throw error;
      toast.success('LinkedIn profile updated!');
    } catch (error) {
      console.error('Error saving LinkedIn URL:', error);
      toast.error('Failed to save LinkedIn URL');
    } finally {
      setSavingLinkedin(false);
    }
  };

  // Portfolio completeness score
  const completeness = useMemo(() => {
    let score = 0;
    const checks = [
      { label: 'At least 1 project', done: projects.length >= 1 },
      { label: '3+ projects', done: projects.length >= 3 },
      { label: 'LinkedIn added', done: !!linkedinUrl },
      { label: 'Bio added', done: !!profileData?.bio },
      { label: 'Verified project', done: projects.some(p => p.is_verified) },
    ];
    checks.forEach(c => { if (c.done) score += 20; });
    return { score, checks };
  }, [projects, linkedinUrl, profileData]);

  // Skill distribution
  const skillCounts: Record<string, number> = {};
  projects.forEach(project => {
    project.tags.forEach(tag => {
      skillCounts[tag] = (skillCounts[tag] || 0) + 1;
    });
  });
  const topSkills = Object.entries(skillCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxSkillCount = topSkills.length > 0 ? topSkills[0][1] : 1;

  // Public share URL
  const publicUrl = currentUserId ? `${window.location.origin}/portfolio/${currentUserId}` : '';

  const copyShareLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setLinkCopied(true);
    toast.success('Portfolio link copied!');
    setTimeout(() => setLinkCopied(false), 2000);
  };

  if (loading) {
    return (
      <PageLayout title="Portfolio">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="">
      {!loading && projects.length === 0 && !isOnline && <OfflineEmptyState />}
      <div className="mb-2">
        <CachedDataIndicator hasData={projects.length > 0} />
      </div>
      <div className="flex items-center justify-between mb-6 -mt-2">
        <div className="flex items-center gap-1 border-b border-border w-full pb-0">
          <Link
            to="/portfolio"
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 border-primary text-primary -mb-px"
          >
            Portfolio
          </Link>
          <Link
            to="/analysis"
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-border transition-colors -mb-px"
          >
            <LineChart className="h-3.5 w-3.5" />
            Market Analysis
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Upload className="h-12 w-12 text-primary" />
                <div className="flex-1">
                  <h3 className="text-xl font-bold">Showcase Your Work</h3>
                  <p className="text-muted-foreground">
                    Upload projects to build your portfolio
                  </p>
                </div>
                <UploadProjectDialog onProjectUploaded={fetchData} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Linkedin className="h-10 w-10 text-[#0A66C2]" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">LinkedIn Profile</h3>
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      placeholder="https://linkedin.com/in/your-profile"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={saveLinkedinUrl} disabled={savingLinkedin} size="sm">
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {projects.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No projects yet</h3>
                <p className="text-muted-foreground mb-4">
                  Upload your first project to start building your portfolio
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className={`cursor-pointer transition-all hover:border-primary/50 ${
                    selectedProject === project.id ? 'border-primary' : ''
                  }`}
                  onClick={() => setSelectedProject(project.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{project.title}</CardTitle>
                      <div className="flex items-center gap-2">
                        {project.is_verified && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Verified
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(project.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {project.tags.map((tag) => (
                        <span key={tag} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-end text-sm">
                      {(project.project_url || project.github_url) && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(project.project_url || project.github_url || '', '_blank');
                          }}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <ProfileSummaryCard />

          {/* Portfolio Completeness */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Portfolio Completeness</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Progress value={completeness.score} className="flex-1 h-2" />
                <span className="text-sm font-bold">{completeness.score}%</span>
              </div>
              <div className="space-y-1.5">
                {completeness.checks.map((c) => (
                  <div key={c.label} className="flex items-center gap-2 text-xs">
                    <CheckCircle className={`h-3.5 w-3.5 ${c.done ? 'text-primary' : 'text-muted'}`} />
                    <span className={c.done ? 'text-foreground' : 'text-muted-foreground'}>{c.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Skills Distribution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Skills in Portfolio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {topSkills.length === 0 ? (
                <p className="text-muted-foreground text-sm">Add projects to see skill breakdown</p>
              ) : (
                topSkills.map(([skill, count]) => (
                  <div key={skill} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>{skill}</span>
                      <span className="text-muted-foreground">{count} project{count > 1 ? 's' : ''}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all"
                        style={{ width: `${(count / maxSkillCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Share Portfolio */}
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="pt-6 space-y-3">
              <h3 className="font-bold text-center">Share Your Portfolio</h3>
              <p className="text-sm text-center opacity-90">
                Let employers see your work
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="secondary"
                  className="flex-1"
                  onClick={copyShareLink}
                >
                  {linkCopied ? <CheckCircle className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  {linkCopied ? 'Copied!' : 'Copy Link'}
                </Button>
                <WhatsAppShareButton
                  url={publicUrl}
                  text={`Check out my portfolio on Syncareer:`}
                  variant="icon"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
};

export default Portfolio;
