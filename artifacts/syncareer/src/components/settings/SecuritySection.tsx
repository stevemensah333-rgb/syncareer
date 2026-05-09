import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';

export function SecuritySection() {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password updated');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <h2 className="text-xl font-semibold mb-6">{t('settings.securitySettings')}</h2>
      <form onSubmit={handleChangePassword} className="space-y-6 max-w-md">
        <div>
          <h3 className="text-lg font-medium mb-2">{t('settings.changePassword')}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Choose a new password — at least 8 characters.
          </p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
          </div>
        </div>
        <Button type="submit" disabled={saving || !newPassword || !confirmPassword}>
          <Shield className="h-4 w-4 mr-2" />
          {saving ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </>
  );
}
