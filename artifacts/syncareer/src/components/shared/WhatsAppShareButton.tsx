import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WhatsAppShareButtonProps {
  text: string;
  url?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'icon';
  className?: string;
  children?: React.ReactNode;
}

export function WhatsAppShareButton({ text, url, variant = 'outline', className, children }: WhatsAppShareButtonProps) {
  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    const shareUrl = url || window.location.origin;
    const message = `${text}\n${shareUrl}`;

    // Prefer native share when available (mobile / PWA) — works around iframe redirect blocks.
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({ text: message, url: shareUrl });
        return;
      } catch {
        // user cancelled or unsupported — fall through to wa.me
      }
    }

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    // window.open escapes the preview iframe; <a target="_blank"> can be intercepted.
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleShare}
        className={cn(
          "inline-flex items-center justify-center h-9 w-9 rounded-full text-muted-foreground hover:text-[#25D366] hover:bg-[#25D366]/10 transition-colors",
          className
        )}
        aria-label="Share on WhatsApp"
      >
        <MessageCircle className="h-4 w-4" />
      </button>
    );
  }

  return (
    <Button
      variant={variant === 'default' ? 'default' : 'outline'}
      size="sm"
      className={cn("gap-2", className)}
      onClick={handleShare}
    >
      <MessageCircle className="h-4 w-4" />
      {children || 'Share on WhatsApp'}
    </Button>
  );
}
