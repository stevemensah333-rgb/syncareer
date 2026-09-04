import { useState } from 'react';
import { AlertTriangle, Lightbulb, MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { SUPPORT_EMAIL } from '@/lib/contact';
import { SettingsGroup } from './SettingsScaffold';

const COMMENT_MAX_LENGTH = 1000;

type FeedbackKind = 'problem' | 'improvement' | 'general';

const KINDS: { id: FeedbackKind; label: string; description: string; icon: typeof MessageSquare; placeholder: string }[] = [
  {
    id: 'problem',
    label: 'Report a problem',
    description: 'Something broke, saved the wrong thing, or blocked you.',
    icon: AlertTriangle,
    placeholder: 'What were you doing, and what happened instead? The page or step you were on helps a lot.',
  },
  {
    id: 'improvement',
    label: 'Suggest an improvement',
    description: 'A change that would make Syncareer more useful.',
    icon: Lightbulb,
    placeholder: 'What should work differently, and why?',
  },
  {
    id: 'general',
    label: 'General feedback',
    description: 'Anything else worth telling the team.',
    icon: MessageSquare,
    placeholder: 'What worked, what did not, or what you are trying to do.',
  },
];

/**
 * Whole-product feedback, written to the same `user_feedback` rows the
 * in-workflow prompts use (feature `general`). The chosen kind is recorded as
 * the response so the admin view can triage problems without a ticket system.
 */
export function FeedbackSection() {
  const [kind, setKind] = useState<FeedbackKind>('problem');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const active = KINDS.find((option) => option.id === kind) ?? KINDS[0]!;

  const submit = async () => {
    const text = comment.trim();
    if (text.length < 10) {
      toast.error('Add a little more detail (at least 10 characters).');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      toast.error('Sign in again to send feedback.');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('user_feedback').insert({
      user_id: session.user.id,
      feature_name: 'general',
      response_type: kind,
      comment: text.slice(0, COMMENT_MAX_LENGTH),
    });
    setSubmitting(false);

    if (error) {
      toast.error('Feedback could not be saved. Email us instead at ' + SUPPORT_EMAIL + '.');
      return;
    }
    setComment('');
    setSent(true);
    toast.success('Thanks — that goes straight to the team.');
  };

  return (
    <SettingsGroup
      title="Feedback"
      description="Syncareer is free and built with students. Feedback is read by the people who write the code — there is no ticket queue, so one clear message beats three short ones."
    >
      <div className="workspace-row space-y-3">
        <p className="type-label" id="feedback-kind-label">
          What kind of feedback is this?
        </p>
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-labelledby="feedback-kind-label">
          {KINDS.map((option) => {
            const Icon = option.icon;
            const selected = option.id === kind;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  setKind(option.id);
                  setSent(false);
                }}
                className={cn(
                  'interactive rounded-control border p-3 text-left',
                  selected ? 'border-primary/40 bg-selected text-selected-foreground' : 'border-border',
                )}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                  {option.label}
                </span>
                <span className={cn('mt-1 block text-xs leading-5', selected ? 'text-selected-foreground/80' : 'text-muted-foreground')}>
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="workspace-row space-y-2">
        <label htmlFor="feedback-comment" className="type-label">
          {active.label}
        </label>
        <Textarea
          id="feedback-comment"
          rows={5}
          maxLength={COMMENT_MAX_LENGTH}
          value={comment}
          onChange={(event) => {
            setComment(event.target.value);
            setSent(false);
          }}
          placeholder={active.placeholder}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="type-metadata">
            {comment.trim().length}/{COMMENT_MAX_LENGTH}
            {sent && <span className="text-success"> · Sent</span>}
          </p>
          <Button size="sm" onClick={() => void submit()} disabled={submitting}>
            {submitting ? <Spinner className="size-3.5" /> : <Send className="size-3.5" aria-hidden="true" />}
            {submitting ? 'Sending…' : 'Send feedback'}
          </Button>
        </div>
      </div>

      <p className="workspace-row type-supporting">
        Need an answer rather than a note? Write to{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline underline-offset-2">
          {SUPPORT_EMAIL}
        </a>{' '}
        — and include the page you are on.
      </p>
    </SettingsGroup>
  );
}
