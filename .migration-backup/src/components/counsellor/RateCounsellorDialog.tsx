import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface RateCounsellorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  counsellorId: string;
  counsellorName: string;
  onRatingSubmitted?: () => void;
}

export function RateCounsellorDialog({
  open,
  onOpenChange,
  counsellorId,
  counsellorName,
  onRatingSubmitted,
}: RateCounsellorDialogProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingReviewId, setExistingReviewId] = useState<string | null>(null);

  // Check for existing review when dialog opens
  useEffect(() => {
    if (!open) return;
    const checkExisting = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data } = await supabase
        .from('counsellor_reviews')
        .select('id, rating, review_text')
        .eq('counsellor_id', counsellorId)
        .eq('reviewer_id', session.user.id)
        .maybeSingle();

      if (data) {
        setExistingReviewId(data.id);
        setRating(data.rating);
        setComment(data.review_text || '');
      } else {
        setExistingReviewId(null);
        setRating(0);
        setComment('');
      }
    };
    checkExisting();
  }, [open, counsellorId]);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error('Please sign in to rate this counsellor');
        return;
      }

      if (existingReviewId) {
        const { error } = await supabase
          .from('counsellor_reviews')
          .update({ rating, review_text: comment.trim() || null })
          .eq('id', existingReviewId);
        if (error) throw error;
        toast.success('Review updated successfully');
      } else {
        const { error } = await supabase
          .from('counsellor_reviews')
          .insert({
            counsellor_id: counsellorId,
            reviewer_id: session.user.id,
            rating,
            review_text: comment.trim() || null,
          });
        if (error) throw error;
        toast.success('Review submitted successfully');
      }

      onOpenChange(false);
      onRatingSubmitted?.();
    } catch (error: any) {
      console.error('Error submitting counsellor review:', error);
      toast.error(error.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{existingReviewId ? 'Update Review' : 'Rate Counsellor'}</DialogTitle>
          <DialogDescription>
            Share your experience with{' '}
            <span className="font-medium text-foreground">{counsellorName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Star Rating */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Your Rating</p>
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= (hoverRating || rating)
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {rating > 0
                ? ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]
                : 'Select a rating'}
            </p>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Review (optional)</p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe your experience with this counsellor..."
              maxLength={600}
              rows={4}
            />
            <p className="text-xs text-muted-foreground text-right">{comment.length}/600</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading || rating === 0}>
              {loading ? 'Submitting...' : existingReviewId ? 'Update Review' : 'Submit Review'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
