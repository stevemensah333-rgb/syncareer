import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star, ArrowLeft, Github, Globe, Award, MessageSquare, GraduationCap, Linkedin, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { RateProjectDialog } from '@/components/portfolio/RateProjectDialog';

interface Project {
  id: string;
  title: string;
  description: string;
  project_url: string | null;
  github_url: string | null;
  tags: string[];
  is_verified: boolean;
  created_at: string;
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

interface SkillEndorsement {
  skill_name: string;
  count: number;
}

interface StudentInfo {
  school: string | null;
  major: string;
  degree_type: string;
  expected_completion: number | null;
}

interface UserSkill {
  skill_name: string;
  proficiency: string;
  category: string;
}

export default function PublicPortfolio() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [endorsements, setEndorsements] = useState<SkillEndorsement[]>([]);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const fetchData = async () => {
    if (!userId) {
      navigate('/');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id || null);

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, bio, linkedin_url')
        .eq('id', userId)
        .maybeSingle();

      if (profileError || !profileData) {
        toast.error('User not found');
        navigate('/');
        return;
      }

      setProfile(profileData);

      // Fetch projects, reviews, endorsements, student details, and skills in parallel
      const [projectsRes, endorsementsRes, studentRes, skillsRes] = await Promise.all([
        supabase.from('portfolio_projects').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('skill_endorsements').select('skill_name').eq('user_id', userId),
        supabase.from('student_details').select('school, major, degree_type, expected_completion').eq('user_id', userId).single(),
        supabase.from('user_skills' as any).select('skill_name, proficiency, category').eq('user_id', userId),
      ]);

      // Process projects with reviews
      const projectIds = (projectsRes.data || []).map(p => p.id);
      let reviewsByProject: Record<string, number[]> = {};
      if (projectIds.length > 0) {
        const { data: reviewsData } = await supabase
          .from('portfolio_reviews')
          .select('project_id, rating')
          .in('project_id', projectIds);
        (reviewsData || []).forEach(r => {
          if (!reviewsByProject[r.project_id]) reviewsByProject[r.project_id] = [];
          reviewsByProject[r.project_id].push(r.rating);
        });
      }

      setProjects((projectsRes.data || []).map(p => ({
        ...p,
        tags: p.tags ?? [],
        is_verified: p.is_verified ?? false,
        avgRating: reviewsByProject[p.id]
          ? reviewsByProject[p.id].reduce((a, b) => a + b, 0) / reviewsByProject[p.id].length
          : 0,
        reviewCount: reviewsByProject[p.id]?.length ?? 0,
      })) as any);

      // Endorsements
      const endorsementCounts: Record<string, number> = {};
      (endorsementsRes.data || []).forEach(e => {
        endorsementCounts[e.skill_name] = (endorsementCounts[e.skill_name] || 0) + 1;
      });
      setEndorsements(
        Object.entries(endorsementCounts)
          .map(([skill_name, count]) => ({ skill_name, count }))
          .sort((a, b) => b.count - a.count)
      );

      // Student details
      if (studentRes.data && !studentRes.error) {
        setStudentInfo(studentRes.data as StudentInfo);
      }

      // User skills
      if (skillsRes.data && !skillsRes.error) {
        setUserSkills((skillsRes.data as any[]) || []);
      }

    } catch (error) {
      console.error('Error fetching portfolio:', error);
      toast.error('Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId, navigate]);

  const handleRateProject = (project: Project) => {
    setSelectedProject(project);
    setRatingDialogOpen(true);
  };

  const getProjectEmoji = (tags: string[]) => {
    const tagLower = tags[0]?.toLowerCase() || '';
    if (tagLower.includes('react') || tagLower.includes('vue')) return '⚛️';
    if (tagLower.includes('node') || tagLower.includes('backend')) return '🖥️';
    if (tagLower.includes('mobile') || tagLower.includes('flutter')) return '📱';
    if (tagLower.includes('data') || tagLower.includes('python')) return '📊';
    if (tagLower.includes('design') || tagLower.includes('ui')) return '🎨';
    if (tagLower.includes('game')) return '🎮';
    return '💼';
  };

  const getProficiencyColor = (proficiency: string) => {
    switch (proficiency.toLowerCase()) {
      case 'expert': return 'bg-green-100 text-green-700 border-green-200';
      case 'advanced': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'intermediate': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-secondary text-secondary-foreground';
    }
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

  if (!profile) {
    return null;
  }

  const displayName = profile.full_name || profile.username || 'Anonymous';
  const totalEndorsements = endorsements.reduce((sum, e) => sum + e.count, 0);

  return (
    <PageLayout title={`${displayName}'s Portfolio`}>
      <div className="max-w-5xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-2xl">
                  {displayName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-1">{displayName}</h1>
                {profile.username && profile.username !== profile.full_name && (
                  <p className="text-muted-foreground mb-1">@{profile.username}</p>
                )}
                {profile.bio && (
                  <p className="text-muted-foreground mb-2">{profile.bio}</p>
                )}

                {/* Student Details */}
                {studentInfo && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 flex-wrap">
                    <GraduationCap className="h-4 w-4" />
                    <span>{studentInfo.degree_type} in {studentInfo.major}</span>
                    {studentInfo.school && (
                      <>
                        <span>•</span>
                        <span>{studentInfo.school}</span>
                      </>
                    )}
                    {studentInfo.expected_completion && (
                      <>
                        <span>•</span>
                        <span>Expected {studentInfo.expected_completion}</span>
                      </>
                    )}
                  </div>
                )}

                {/* LinkedIn */}
                {profile.linkedin_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 mb-3"
                    onClick={() => window.open(profile.linkedin_url!, '_blank')}
                  >
                    <Linkedin className="h-4 w-4" />
                    LinkedIn Profile
                  </Button>
                )}

                <div className="flex items-center gap-4 mt-2">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{projects.length}</p>
                    <p className="text-xs text-muted-foreground">Projects</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{totalEndorsements}</p>
                    <p className="text-xs text-muted-foreground">Endorsements</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{userSkills.length || endorsements.length}</p>
                    <p className="text-xs text-muted-foreground">Skills</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Projects */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold">Projects</h2>
            {projects.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No projects yet.
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {projects.map((project) => (
                  <Card key={project.id} className="hover:border-primary/50 transition-colors">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="text-4xl mb-2">{getProjectEmoji(project.tags)}</div>
                        <div className="flex items-center gap-2">
                          {(project.reviewCount ?? 0) > 0 && (
                            <div className="flex items-center gap-1 text-sm">
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                              <span className="font-medium">{project.avgRating?.toFixed(1)}</span>
                              <span className="text-muted-foreground">({project.reviewCount})</span>
                            </div>
                          )}
                          {project.is_verified && (
                            <Badge variant="secondary" className="gap-1">
                              <Award className="h-3 w-3" />
                              Verified
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CardTitle className="text-lg">{project.title}</CardTitle>
                      <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {project.tags.map((tag) => (
                          <Badge key={tag} variant="outline">{tag}</Badge>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {project.project_url && (
                          <Button size="sm" variant="outline" onClick={() => window.open(project.project_url!, '_blank')}>
                            <Globe className="h-4 w-4 mr-1" /> Demo
                          </Button>
                        )}
                        {project.github_url && (
                          <Button size="sm" variant="outline" onClick={() => window.open(project.github_url!, '_blank')}>
                            <Github className="h-4 w-4 mr-1" /> Code
                          </Button>
                        )}
                        {currentUserId && currentUserId !== userId && (
                          <Button size="sm" variant="secondary" onClick={() => handleRateProject(project)}>
                            <MessageSquare className="h-4 w-4 mr-1" /> Rate
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Added {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Skills */}
            {userSkills.length > 0 && (
              <>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <BookOpen className="h-5 w-5" /> Skills
                </h2>
                <Card>
                  <CardContent className="pt-6 space-y-2">
                    {userSkills.map((skill) => (
                      <div key={skill.skill_name} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{skill.skill_name}</span>
                        <Badge variant="outline" className={getProficiencyColor(skill.proficiency)}>
                          {skill.proficiency}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}

            {/* Endorsements */}
            <h2 className="text-xl font-semibold">Endorsements</h2>
            {endorsements.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No endorsements yet.
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6 space-y-3">
                  {endorsements.map((endorsement) => (
                    <div key={endorsement.skill_name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium">{endorsement.skill_name}</span>
                      </div>
                      <Badge variant="secondary">
                        {endorsement.count} endorsement{endorsement.count !== 1 ? 's' : ''}
                      </Badge>
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
      </div>
    </PageLayout>
  );
}
