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
  const shareUrl = url || window.location.origin;
  const message = `${text}\n${shareUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

  if (variant === 'icon') {
    return (
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center justify-center h-9 w-9 rounded-full text-muted-foreground hover:text-[#25D366] hover:bg-[#25D366]/10 transition-colors",
          className
        )}
        aria-label="Share on WhatsApp"
      >
        <MessageCircle className="h-4 w-4" />
      </a>
    );
  }

  return (
    <Button
      variant={variant === 'default' ? 'default' : 'outline'}
      size="sm"
      className={cn("gap-2", className)}
      asChild
    >
      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="h-4 w-4" />
        {children || 'Share on WhatsApp'}
      </a>
    </Button>
  );
}
