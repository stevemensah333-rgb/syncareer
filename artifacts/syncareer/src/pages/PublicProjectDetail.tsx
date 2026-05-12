import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Github, Globe } from 'lucide-react';
import logo from '@/assets/syncareer-logo.svg';
import { setMetaTags } from '@/lib/seo';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string;
  project_url: string | null;
  github_url: string | null;
  tags: string[] | null;
  cover_image_url: string | null;
  role: string | null;
  problem: string | null;
  approach: string | null;
  outcome: string | null;
  tech_stack: string[] | null;
  screenshots: string[] | null;
  lessons_learned: string | null;
  slug: string | null;
}

export default function PublicProjectDetail() {
  const params = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [ownerName, setOwnerName] = useState<string>('');
  const [ownerKey, setOwnerKey] = useState<string>(''); // for back link
  const [loading, setLoading] = useState(true);

  const routeOwner = params.userId ?? params.slug ?? '';
  const projectKey = params.projectId ?? params.projectSlug ?? '';

  useEffect(() => {
    (async () => {
      // resolve owner
      let ownerId: string | null = null;
      if (UUID_RE.test(routeOwner)) ownerId = routeOwner;
      else {
        const { data } = await supabase.from('profiles').select('id, full_name, username').eq('username', routeOwner).maybeSingle();
        ownerId = data?.id ?? null;
        if (data) setOwnerName(data.full_name || data.username || '');
      }
      if (!ownerId) {
        navigate('/');
        return;
      }
      setOwnerKey(routeOwner);

      // owner display name (if uuid path)
      if (UUID_RE.test(routeOwner)) {
        const { data } = await supabase.from('profiles').select('full_name, username').eq('id', ownerId).maybeSingle();
        setOwnerName(data?.full_name || data?.username || '');
      }

      // resolve project (id or slug)
      let q = supabase.from('portfolio_projects').select('*').eq('user_id', ownerId);
      q = UUID_RE.test(projectKey) ? q.eq('id', projectKey) : q.eq('slug', projectKey);
      const { data: p } = await q.maybeSingle();
      if (!p) {
        navigate(`/u/${routeOwner}`);
        return;
      }
      setProject(p as any);
      setLoading(false);

      setMetaTags({
        title: `${p.title} · ${ownerName || 'Portfolio'} · Syncareer`,
        description: (p.description || '').slice(0, 160),
        ogTitle: p.title,
        ogDescription: (p.description || '').slice(0, 160),
        ogImage: (p as any).cover_image_url || undefined,
        ogUrl: window.location.href,
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeOwner, projectKey]);

  if (loading || !project) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const portfolioHref = `/${UUID_RE.test(ownerKey) ? `portfolio/${ownerKey}` : `u/${ownerKey}`}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2"><img src={logo} alt="Syncareer" className="h-7 w-auto" /></Link>
          <Link to={portfolioHref} className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to portfolio
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {project.cover_image_url && (
          <img src={project.cover_image_url} alt={project.title} className="w-full rounded-lg mb-8 max-h-96 object-cover" />
        )}
        <h1 className="text-3xl md:text-4xl font-bold mb-3">{project.title}</h1>
        {project.role && <p className="text-muted-foreground mb-4">My role: {project.role}</p>}

        <div className="flex flex-wrap gap-2 mb-6">
          {(project.tech_stack && project.tech_stack.length > 0 ? project.tech_stack : (project.tags || [])).map((t) => (
            <Badge key={t} variant="outline">{t}</Badge>
          ))}
        </div>

        <div className="flex gap-2 mb-8">
          {project.project_url && (
            <Button variant="outline" onClick={() => window.open(project.project_url!, '_blank')}>
              <Globe className="h-4 w-4 mr-1" /> Live demo
            </Button>
          )}
          {project.github_url && (
            <Button variant="outline" onClick={() => window.open(project.github_url!, '_blank')}>
              <Github className="h-4 w-4 mr-1" /> Code
            </Button>
          )}
        </div>

        <section className="prose prose-neutral max-w-none space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Overview</h2>
            <p className="text-muted-foreground whitespace-pre-line">{project.description}</p>
          </div>
          {project.problem && (
            <div>
              <h2 className="text-xl font-semibold">Problem</h2>
              <p className="text-muted-foreground whitespace-pre-line">{project.problem}</p>
            </div>
          )}
          {project.approach && (
            <div>
              <h2 className="text-xl font-semibold">Approach</h2>
              <p className="text-muted-foreground whitespace-pre-line">{project.approach}</p>
            </div>
          )}
          {project.outcome && (
            <div>
              <h2 className="text-xl font-semibold">Outcome</h2>
              <p className="text-muted-foreground whitespace-pre-line">{project.outcome}</p>
            </div>
          )}
          {project.lessons_learned && (
            <div>
              <h2 className="text-xl font-semibold">Lessons learned</h2>
              <p className="text-muted-foreground whitespace-pre-line">{project.lessons_learned}</p>
            </div>
          )}
        </section>

        {project.screenshots && project.screenshots.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold mb-4">Screenshots</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {project.screenshots.map((src) => (
                <img key={src} src={src} alt="" className="w-full rounded border border-border" />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
