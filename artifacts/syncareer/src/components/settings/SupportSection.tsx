import { HeartHandshake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsGroup, SettingsRow, SettingsValue } from './SettingsScaffold';
import { supportUrl } from '@/lib/support';

/**
 * Optional, voluntary support. It is deliberately plain: no pricing, no tiers,
 * no status badge, and nothing in the product changes based on it. The link is
 * an external one-time contribution page (`VITE_SUPPORT_URL`); the whole
 * destination disappears when that is unconfigured.
 */
export function SupportSection() {
  return (
    <div className="space-y-4">
      <SettingsGroup
        title="Support Syncareer"
        description="Syncareer is free to use, and every feature is available to every account. Optional support simply helps keep development going."
      >
        <SettingsRow
          label="One-time contribution"
          hint="It does not unlock anything, change your access, or create a membership. Skipping it costs you nothing."
        >
          <Button variant="outline" size="sm" asChild>
            <a href={supportUrl()} target="_blank" rel="noopener noreferrer">
              <HeartHandshake className="size-3.5" aria-hidden="true" />
              Support Syncareer
            </a>
          </Button>
        </SettingsRow>

        <SettingsRow label="Elsewhere" hint="Bug reports and ideas are more useful to the project than money is.">
          <SettingsValue>Free either way</SettingsValue>
        </SettingsRow>
      </SettingsGroup>
    </div>
  );
}
