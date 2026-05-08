import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ThumbsUp, ThumbsDown, Send, X } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onSubmit: (responseType: 'positive' | 'negative', comment?: string) => void;
  onDismiss: () => void;
}

type Step = 'initial' | 'positive_comment' | 'negative_comment';

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onSubmit, onDismiss }) => {
  const [step, setStep] = useState<Step>('initial');
  const [comment, setComment] = useState('');

  const handlePositive = () => setStep('positive_comment');
  const handleNegative = () => setStep('negative_comment');

  const handleSubmitPositive = () => {
    onSubmit('positive', comment.trim() || undefined);
    resetState();
  };

  const handleSubmitNegative = () => {
    if (!comment.trim()) return; // required for negative
    onSubmit('negative', comment.trim());
    resetState();
  };

  const handleSkipPositive = () => {
    onSubmit('positive');
    resetState();
  };

  const resetState = () => {
    setStep('initial');
    setComment('');
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onDismiss();
      resetState();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">
            {step === 'initial' && 'Was this helpful?'}
            {step === 'positive_comment' && 'Glad to hear!'}
            {step === 'negative_comment' && 'We\'re sorry to hear that'}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {step === 'initial' && 'Your feedback helps us improve.'}
            {step === 'positive_comment' && 'What could make this even better?'}
            {step === 'negative_comment' && 'What didn\'t work for you?'}
          </DialogDescription>
        </DialogHeader>

        {step === 'initial' && (
          <div className="flex items-center justify-center gap-4 py-4">
            <Button
              variant="outline"
              size="lg"
              onClick={handlePositive}
              className="flex items-center gap-2 px-6"
            >
              <ThumbsUp className="h-5 w-5" />
              Yes
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleNegative}
              className="flex items-center gap-2 px-6"
            >
              <ThumbsDown className="h-5 w-5" />
              No
            </Button>
          </div>
        )}

        {step === 'positive_comment' && (
          <div className="space-y-3">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 200))}
              placeholder="Optional: share your thoughts..."
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{comment.length}/200</p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={handleSkipPositive}>
                Skip
              </Button>
              <Button size="sm" onClick={handleSubmitPositive}>
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Submit
              </Button>
            </div>
          </div>
        )}

        {step === 'negative_comment' && (
          <div className="space-y-3">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 200))}
              placeholder="Please tell us what went wrong..."
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{comment.length}/200</p>
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                onClick={handleSubmitNegative}
                disabled={!comment.trim()}
              >
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Submit
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
