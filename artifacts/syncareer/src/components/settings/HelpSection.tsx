import { Link } from 'react-router-dom';
import { Mail, Phone } from 'lucide-react';
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_HREF } from '@/lib/contact';
import { SettingsGroup, SettingsRow, SettingsValue } from './SettingsScaffold';

/**
 * Help is a short list of channels that already exist — a person reading email,
 * a phone line, and the two documents that explain data and terms. It is not a
 * knowledge base: Syncareer has no article store, so nothing is invented here.
 */
export function HelpSection() {
  return (
    <div className="space-y-4">
      <SettingsGroup
        title="Talk to the team"
        description="One person or a small group reads these; there is no ticket number and no portal."
      >
        <SettingsRow label="Email" hint="Best for anything with a screenshot or a link.">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="flex items-center gap-2 text-sm text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Mail className="size-3.5" aria-hidden="true" />
            {SUPPORT_EMAIL}
          </a>
        </SettingsRow>

        <SettingsRow label="Phone" hint="Call or WhatsApp if email is the slower route for you.">
          <a
            href={SUPPORT_PHONE_HREF}
            className="flex items-center gap-2 text-sm text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Phone className="size-3.5" aria-hidden="true" />
            {SUPPORT_PHONE}
          </a>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="In the meantime" description="Most questions are one control away.">
        <SettingsRow label="Something is broken or missing" hint="Feedback lands in the same inbox, attached to your account.">
          <Link to="/settings?tab=feedback" className="text-sm text-primary underline underline-offset-2">
            Send feedback
          </Link>
        </SettingsRow>

        <SettingsRow label="Too many emails" hint="Turn categories off here, or use the unsubscribe link at the bottom of any Syncareer email.">
          <Link to="/settings?tab=notifications" className="text-sm text-primary underline underline-offset-2">
            Notification settings
          </Link>
        </SettingsRow>

        <SettingsRow label="Where your data goes" hint="What is stored, who can see it, and what deletion covers.">
          <div className="flex gap-3">
            <Link to="/privacy" className="text-sm text-primary underline underline-offset-2">
              Privacy policy
            </Link>
            <Link to="/terms" className="text-sm text-primary underline underline-offset-2">
              Terms
            </Link>
          </div>
        </SettingsRow>

        <SettingsRow label="Mentor profile and availability" hint="Mentors manage their public details on the mentor profile page.">
          <SettingsValue>
            <Link to="/mentor/profile" className="text-primary underline underline-offset-2">
              Open mentor profile
            </Link>
          </SettingsValue>
        </SettingsRow>
      </SettingsGroup>
    </div>
  );
}
