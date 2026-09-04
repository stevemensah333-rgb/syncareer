import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ThumbsUp, ThumbsDown, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Whole-product feedback entry point (profile menu → Feedback).
 *
 * Reuses the existing feedback mechanism: the same `user_feedback` table and
 * thumbs-up/down + comment shape as the in-feature FeedbackModal. The profile
 * context is recorded as feature_name 'general'.
 */
interface GeneralFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'initial' | 'positive_comment' | 'negative_comment';

export function GeneralFeedbackDialog({ open, onOpenChange }: GeneralFeedbackDialogProps) {
  const [step, setStep] = useState<Step>('initial');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setStep('initial');
    setComment('');
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset();
      onOpenChange(false);
    }
  };

  const submit = async (responseType: 'positive' | 'negative') => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      toast.error('Sign in to send feedback.');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('user_feedback').insert({
      user_id: session.user.id,
      feature_name: 'general',
      response_type: responseType,
      comment: comment.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      console.error('[feedback] insert failed', error);
      toast.error('Could not send feedback. Email us at syncareer01@gmail.com instead.');
      return;
    }
    toast.success('Thanks — your feedback helps us improve.');
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">
            {step === 'initial' && 'Send feedback'}
            {step === 'positive_comment' && 'Glad to hear!'}
            {step === 'negative_comment' && "We're sorry to hear that"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {step === 'initial' && 'Syncareer is free. Tell us what worked and what could be better.'}
            {step === 'positive_comment' && 'What could make Syncareer even more useful to you?'}
            {step === 'negative_comment' && "What didn't work for you?"}
          </DialogDescription>
        </DialogHeader>

        {step === 'initial' && (
          <div className="flex items-center justify-center gap-4 py-4">
            <Button variant="outline" size="lg" onClick={() => setStep('positive_comment')} className="flex items-center gap-2 px-6">
              <ThumbsUp className="h-5 w-5" />
              It helped
            </Button>
            <Button variant="outline" size="lg" onClick={() => setStep('negative_comment')} className="flex items-center gap-2 px-6">
              <ThumbsDown className="h-5 w-5" />
              Needs work
            </Button>
          </div>
        )}

        {(step === 'positive_comment' || step === 'negative_comment') && (
          <div className="space-y-3">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              placeholder={step === 'positive_comment' ? 'Optional: share your thoughts…' : 'Please tell us what went wrong…'}
              rows={4}
              className="resize-none"
              autoFocus
            />
            <p className="text-right text-xs text-muted-foreground">{comment.length}/500</p>
            <div className="flex justify-end gap-2">
              {step === 'positive_comment' && (
                <Button variant="ghost" size="sm" onClick={() => void submit('positive')} disabled={submitting}>
                  Skip
                </Button>
              )}
              <Button size="sm" onClick={() => void submit(step === 'positive_comment' ? 'positive' : 'negative')} disabled={submitting || (step === 'negative_comment' && !comment.trim())}>
                <Send className="mr-1.5 h-3.5 w-3.5" />
                {submitting ? 'Sending…' : 'Submit'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
