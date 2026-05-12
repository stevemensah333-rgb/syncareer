import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, X, Link } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface UploadProjectDialogProps {
  onProjectUploaded?: () => void;
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 60);

export function UploadProjectDialog({ onProjectUploaded }: UploadProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    projectUrl: '',
    githubUrl: '',
    coverImageUrl: '',
    role: '',
    problem: '',
    approach: '',
    outcome: '',
    lessonsLearned: '',
    screenshotsCsv: '',
  });
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [techInput, setTechInput] = useState('');
  const [techStack, setTechStack] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addTo = (val: string, list: string[], setList: (v: string[]) => void, max = 8) => {
    const v = val.trim();
    if (v && !list.includes(v) && list.length < max) setList([...list, v]);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Title and description are required');
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { toast.error('Please sign in'); return; }

      const screenshots = formData.screenshotsCsv
        .split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);

      const slug = slugify(formData.title);

      const { error } = await supabase.from('portfolio_projects').insert({
        user_id: session.user.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        project_url: formData.projectUrl.trim() || null,
        github_url: formData.githubUrl.trim() || null,
        tags,
        slug,
        cover_image_url: formData.coverImageUrl.trim() || null,
        role: formData.role.trim() || null,
        problem: formData.problem.trim() || null,
        approach: formData.approach.trim() || null,
        outcome: formData.outcome.trim() || null,
        lessons_learned: formData.lessonsLearned.trim() || null,
        tech_stack: techStack,
        screenshots,
      } as any);

      if (error) throw error;
      toast.success('Project uploaded!');
      setFormData({ title: '', description: '', projectUrl: '', githubUrl: '', coverImageUrl: '', role: '', problem: '', approach: '', outcome: '', lessonsLearned: '', screenshotsCsv: '' });
      setTags([]); setTechStack([]);
      setOpen(false);
      onProjectUploaded?.();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to upload');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>Upload Project</Button></DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Upload New Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4 max-h-[65vh] overflow-y-auto pr-2">
          <div className="space-y-2">
            <Label>Project Title *</Label>
            <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., E-Commerce Platform" />
          </div>
          <div className="space-y-2">
            <Label>Short description *</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="One paragraph: what it is and what you built." rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Cover image URL</Label>
            <Input value={formData.coverImageUrl} onChange={(e) => setFormData({ ...formData, coverImageUrl: e.target.value })} placeholder="https://..." />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Project URL</Label>
              <div className="relative">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={formData.projectUrl} onChange={(e) => setFormData({ ...formData, projectUrl: e.target.value })} placeholder="https://demo.com" className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>GitHub</Label>
              <div className="relative">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={formData.githubUrl} onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })} placeholder="https://github.com/..." className="pl-10" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Your role</Label>
            <Input value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} placeholder="Lead frontend / Solo developer / UX designer" />
          </div>

          <div className="space-y-3 border-t pt-3">
            <p className="text-xs text-muted-foreground font-medium">Case study (optional but recommended)</p>
            <div className="space-y-2">
              <Label>Problem</Label>
              <Textarea rows={2} value={formData.problem} onChange={(e) => setFormData({ ...formData, problem: e.target.value })} placeholder="What problem did this solve?" />
            </div>
            <div className="space-y-2">
              <Label>Approach</Label>
              <Textarea rows={2} value={formData.approach} onChange={(e) => setFormData({ ...formData, approach: e.target.value })} placeholder="How did you approach it?" />
            </div>
            <div className="space-y-2">
              <Label>Outcome</Label>
              <Textarea rows={2} value={formData.outcome} onChange={(e) => setFormData({ ...formData, outcome: e.target.value })} placeholder="Results / metrics / impact" />
            </div>
            <div className="space-y-2">
              <Label>Lessons learned</Label>
              <Textarea rows={2} value={formData.lessonsLearned} onChange={(e) => setFormData({ ...formData, lessonsLearned: e.target.value })} placeholder="What would you do differently?" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tech stack</Label>
            <div className="flex gap-2">
              <Input value={techInput} onChange={(e) => setTechInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTo(techInput, techStack, setTechStack); setTechInput(''); }}} placeholder="React, Postgres" />
              <Button type="button" variant="outline" onClick={() => { addTo(techInput, techStack, setTechStack); setTechInput(''); }}>Add</Button>
            </div>
            {techStack.length > 0 && <div className="flex flex-wrap gap-2">{techStack.map((t) => (<span key={t} className="inline-flex items-center gap-1 text-sm bg-secondary px-2 py-1 rounded-full">{t}<button onClick={() => setTechStack(techStack.filter((x) => x !== t))}><X className="h-3 w-3" /></button></span>))}</div>}
          </div>

          <div className="space-y-2">
            <Label>Tags (categories shown on card)</Label>
            <div className="flex gap-2">
              <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTo(tagInput, tags, setTags, 6); setTagInput(''); }}} placeholder="Web · Mobile · Data" disabled={tags.length >= 6} />
              <Button type="button" variant="outline" onClick={() => { addTo(tagInput, tags, setTags, 6); setTagInput(''); }} disabled={!tagInput.trim() || tags.length >= 6}>Add</Button>
            </div>
            {tags.length > 0 && <div className="flex flex-wrap gap-2">{tags.map((t) => (<span key={t} className="inline-flex items-center gap-1 text-sm bg-secondary px-2 py-1 rounded-full">{t}<button onClick={() => setTags(tags.filter((x) => x !== t))}><X className="h-3 w-3" /></button></span>))}</div>}
          </div>

          <div className="space-y-2">
            <Label>Screenshots (one URL per line)</Label>
            <Textarea rows={3} value={formData.screenshotsCsv} onChange={(e) => setFormData({ ...formData, screenshotsCsv: e.target.value })} placeholder="https://...png&#10;https://...png" />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              <Upload className="h-4 w-4 mr-2" />{isSubmitting ? 'Uploading…' : 'Upload Project'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
