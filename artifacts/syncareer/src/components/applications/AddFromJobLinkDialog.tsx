import { useState } from 'react';
import { Link2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import {
  createApplicationFromPosting,
  readJobLink,
  type ScrapedPosting,
} from '@/features/application-tracker/jobLink';

type Step = 'link' | 'review' | 'manual';

interface AddFromJobLinkDialogProps {
  userId: string | null;
  onCreated: (applicationId: string) => void;
}

/**
 * Opens an application from a job posting the student found elsewhere. The
 * page is read for them; when a job board blocks that, they can paste the
 * posting text instead so the workspace still has the facts it needs.
 */
export function AddFromJobLinkDialog({ userId, onCreated }: AddFromJobLinkDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('link');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [link, setLink] = useState('');
  const [posting, setPosting] = useState<ScrapedPosting | null>(null);
  const [title, setTitle] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [description, setDescription] = useState('');

  const reset = () => {
    setStep('link');
    setBusy(false);
    setError(null);
    setLink('');
    setPosting(null);
    setTitle('');
    setOrganisation('');
    setDescription('');
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  const read = async () => {
    setBusy(true);
    setError(null);
    const result = await readJobLink(supabase, link);
    setBusy(false);
    if (!result.ok) {
      setError(result.userMessage);
      return;
    }
    setPosting(result.posting);
    setTitle(result.posting.title ?? '');
    setOrganisation(result.posting.organisation ?? '');
    setDescription(result.posting.description ?? '');
    setStep('review');
  };

  const create = async () => {
    if (!userId) {
      setError('Your session has expired. Please sign in again.');
      return;
    }
    if (!title.trim()) {
      setError('Give the role a title so you can recognise it later.');
      return;
    }
    setBusy(true);
    setError(null);
    const result = await createApplicationFromPosting(
      supabase,
      userId,
      posting
        ? { ...posting, title: title.trim(), organisation: organisation.trim() || null, description }
        : { title: title.trim(), organisation: organisation.trim(), description, sourceUrl: link.trim() || null },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.userMessage);
      return;
    }
    handleOpenChange(false);
    onCreated(result.applicationId);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Link2 className="size-4" aria-hidden="true" />
          Add from a job link
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a job you found elsewhere</DialogTitle>
          <DialogDescription>
            Paste the link to the posting. Syncareer reads it and opens an application workspace with
            the role, the description and its requirements.
          </DialogDescription>
        </DialogHeader>

        {step === 'link' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="job-link">Job posting link</Label>
              <Input
                id="job-link"
                type="url"
                inputMode="url"
                placeholder="https://…"
                value={link}
                onChange={(event) => setLink(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !busy) void read();
                }}
              />
            </div>
            <button
              type="button"
              className="type-meta underline underline-offset-2"
              onClick={() => {
                setError(null);
                setStep('manual');
              }}
            >
              Or paste the job description yourself
            </button>
          </div>
        )}

        {(step === 'review' || step === 'manual') && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="job-title">Role</Label>
                <Input id="job-title" value={title} onChange={(event) => setTitle(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="job-org">Organisation</Label>
                <Input id="job-org" value={organisation} onChange={(event) => setOrganisation(event.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="job-description">Job description</Label>
              <Textarea
                id="job-description"
                rows={8}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Paste the posting text here."
              />
              <p className="type-meta">
                {step === 'review'
                  ? 'Read from the page. Correct anything that came through wrong.'
                  : 'Everything you paste stays on your own application.'}
              </p>
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          {step === 'link' ? (
            <Button onClick={() => void read()} disabled={busy || !link.trim()}>
              {busy && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
              {busy ? 'Reading the page…' : 'Read the posting'}
            </Button>
          ) : (
            <Button onClick={() => void create()} disabled={busy}>
              {busy && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
              Open application
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
