import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface RateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectTitle: string;
  onRatingSubmitted?: () => void;
}

export function RateProjectDialog({
  open,
  onOpenChange,
  projectId,
  projectTitle,
  onRatingSubmitted,
}: RateProjectDialogProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error('Please sign in to rate projects');
        return;
      }

      // Check if user already reviewed this project
      const { data: existingReview } = await supabase
        .from('portfolio_reviews')
        .select('id')
        .eq('project_id', projectId)
        .eq('reviewer_id', session.user.id)
        .single();

      if (existingReview) {
        // Update existing review
        const { error } = await supabase
          .from('portfolio_reviews')
          .update({
            rating,
            comment: comment.trim() || null,
          })
          .eq('id', existingReview.id);

        if (error) throw error;
        toast.success('Review updated!');
      } else {
        // Create new review
        const { error } = await supabase
          .from('portfolio_reviews')
          .insert({
            project_id: projectId,
            reviewer_id: session.user.id,
            rating,
            comment: comment.trim() || null,
          });

        if (error) throw error;
        toast.success('Review submitted!');
      }

      setRating(0);
      setComment('');
      onOpenChange(false);
      onRatingSubmitted?.();
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast.error(error.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rate Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Rating for: <span className="font-medium text-foreground">{projectTitle}</span>
            </p>
          </div>

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
            {rating > 0 ? `${rating} star${rating !== 1 ? 's' : ''}` : 'Select a rating'}
          </p>

          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment (optional)..."
            maxLength={500}
            rows={3}
          />
          <p className="text-xs text-muted-foreground text-right">
            {comment.length}/500
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading || rating === 0}>
              {loading ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
