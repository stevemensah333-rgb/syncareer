import React from 'react';
import { useClerk } from '@clerk/react';
import { useTranslation } from 'react-i18next';
import { Shield, ShieldCheck, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SecuritySection() {
  const { t } = useTranslation();
  const { openUserProfile } = useClerk();

  return (
    <>
      <h2 className="text-xl font-semibold mb-6">{t('settings.securitySettings')}</h2>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-2">{t('settings.changePassword')}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Password and two-factor authentication are managed through your account security settings.
          </p>
          <Button variant="outline" onClick={() => openUserProfile()}>
            <Shield className="h-4 w-4 mr-2" />
            Manage Password &amp; Security
            <ExternalLink className="h-3.5 w-3.5 ml-2" />
          </Button>
        </div>

        <div className="pt-4 border-t">
          <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            {t('settings.twoFactorAuth')}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t('settings.twoFactorAuthDesc')}
          </p>
          <Button variant="outline" onClick={() => openUserProfile()}>
            <Shield className="h-4 w-4 mr-2" />
            {t('settings.enable2FA')}
            <ExternalLink className="h-3.5 w-3.5 ml-2" />
          </Button>
        </div>
      </div>
    </>
  );
}
