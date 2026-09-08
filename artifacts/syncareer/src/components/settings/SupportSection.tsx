import { useState } from 'react';
import { Copy, Mail, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SettingsGroup, SettingsRow, SettingsValue } from './SettingsScaffold';
import { toast } from 'sonner';
import { supportMomoNumber, supportEmailHref, supportSmsHref, SUPPORT_DEFAULT_MESSAGE } from '@/lib/support';


/**
 * Optional, voluntary support. It is deliberately plain: no pricing, no tiers,
 * no status badge, and nothing in the product changes based on it. A donor
 * sends any amount via Mobile Money to the Syncareer number, then optionally
 * sends a short message (WhatsApp or SMS) so the team can acknowledge it.
 */
export function SupportSection() {
  const [message, setMessage] = useState(SUPPORT_DEFAULT_MESSAGE);
  const momo = supportMomoNumber();

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(momo.replace(/\s/g, ''));
      toast.success('MoMo number copied');
    } catch {
      toast.error('Could not copy the number');
    }
  };

  return (
    <div className="space-y-4">
      <SettingsGroup
        title="Support Syncareer"
        description="Syncareer is free to use, and every feature is available to every account. Optional support simply helps keep development going."
      >
        <SettingsRow
          label="Send via Mobile Money"
          hint="Transfer any amount from your MoMo wallet to the number below. It does not unlock anything, change your access, or create a membership."
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="rounded-md bg-muted px-3 py-1.5 text-sm font-medium">{momo}</code>
            <Button variant="outline" size="sm" onClick={copyNumber}>
              <Copy className="size-3.5" aria-hidden="true" />
              Copy number
            </Button>
          </div>
        </SettingsRow>

        <SettingsRow
          label="Send a message along"
          hint="Let the team know you contributed, or send a word of encouragement. Opens your email app or your phone's messaging app."
        >
          <div className="space-y-3">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Write a short message…"
              className="resize-none"
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={supportGmailHref(message)} target="_blank" rel="noopener noreferrer">
                  <Mail className="size-3.5" aria-hidden="true" />
                  Email via Gmail
                </a>
              </Button>

              <Button variant="outline" size="sm" asChild>
                <a href={supportEmailHref(message)} target="_blank" rel="noopener noreferrer">
                  <Mail className="size-3.5" aria-hidden="true" />
                  Use my email app
                </a>
              </Button>

              <Button variant="outline" size="sm" asChild>
                <a href={supportSmsHref(message)}>
                  <Smartphone className="size-3.5" aria-hidden="true" />
                  SMS
                </a>
              </Button>
            </div>
          </div>
        </SettingsRow>

        <SettingsRow label="Elsewhere" hint="Bug reports and ideas are more useful to the project than money is.">
          <SettingsValue>Free either way</SettingsValue>
        </SettingsRow>
      </SettingsGroup>
    </div>
  );
}
