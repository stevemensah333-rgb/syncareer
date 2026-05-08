import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Shield, ShieldCheck, ShieldOff, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function SecuritySection() {
  const { toast } = useToast();
  const { t } = useTranslation();

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [isOAuthUser, setIsOAuthUser] = useState(false);

  // 2FA state
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);
  const [showUnenrollConfirm, setShowUnenrollConfirm] = useState(false);
  const [loadingMfa, setLoadingMfa] = useState(true);

  useEffect(() => {
    checkAuthProvider();
    loadMfaFactors();
  }, []);

  const checkAuthProvider = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const isOAuth = user.app_metadata?.provider !== 'email' && user.app_metadata?.providers?.length === 1;
      setIsOAuthUser(isOAuth);
    }
  };

  const loadMfaFactors = async () => {
    setLoadingMfa(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      setMfaFactors(data?.totp || []);
    } catch (error) {
      console.error('Error loading MFA factors:', error);
    } finally {
      setLoadingMfa(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({ title: 'Error', description: 'Please fill in all password fields.', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: 'Password updated', description: 'Your password has been changed successfully.' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update password.', variant: 'destructive' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleEnrollMfa = async () => {
    setEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Authenticator App' });
      if (error) throw error;
      setQrCode(data.totp.qr_code);
      setTotpSecret(data.totp.secret);
      setFactorId(data.id);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to start 2FA enrollment.', variant: 'destructive' });
      setEnrolling(false);
    }
  };

  const handleVerifyMfa = async () => {
    if (!factorId || !verifyCode) return;
    setVerifying(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verifyCode,
      });
      if (verifyError) throw verifyError;

      toast({ title: '2FA enabled', description: 'Two-factor authentication has been enabled.' });
      setQrCode(null);
      setTotpSecret(null);
      setVerifyCode('');
      setFactorId(null);
      setEnrolling(false);
      loadMfaFactors();
    } catch (error: any) {
      toast({ title: 'Verification failed', description: error.message || 'Invalid code. Please try again.', variant: 'destructive' });
    } finally {
      setVerifying(false);
    }
  };

  const handleUnenrollMfa = async () => {
    const verifiedFactor = mfaFactors.find(f => f.status === 'verified');
    if (!verifiedFactor) return;
    setUnenrolling(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: verifiedFactor.id });
      if (error) throw error;
      toast({ title: '2FA disabled', description: 'Two-factor authentication has been disabled.' });
      setShowUnenrollConfirm(false);
      loadMfaFactors();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to disable 2FA.', variant: 'destructive' });
    } finally {
      setUnenrolling(false);
    }
  };

  const cancelEnrollment = () => {
    setQrCode(null);
    setTotpSecret(null);
    setVerifyCode('');
    setFactorId(null);
    setEnrolling(false);
  };

  const hasVerifiedFactor = mfaFactors.some(f => f.status === 'verified');

  return (
    <>
      <h2 className="text-xl font-semibold mb-6">{t('settings.securitySettings')}</h2>
      <div className="space-y-6">
        {/* Change Password */}
        <div>
          <h3 className="text-lg font-medium mb-4">{t('settings.changePassword')}</h3>
          {isOAuthUser ? (
            <p className="text-sm text-muted-foreground">
              Your account uses Google sign-in. Password management is handled by Google.
            </p>
          ) : (
            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label>{t('settings.newPassword')}</Label>
                <div className="relative">
                  <Input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('settings.confirmPassword')}</Label>
                <div className="relative">
                  <Input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button onClick={handleChangePassword} disabled={changingPassword}>
                {changingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {changingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          )}
        </div>

        {/* Two-Factor Authentication */}
        <div className="pt-4 border-t">
          <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('settings.twoFactorAuth')}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">{t('settings.twoFactorAuthDesc')}</p>

          {loadingMfa ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading 2FA status...
            </div>
          ) : hasVerifiedFactor ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <ShieldCheck className="h-5 w-5" />
                Two-factor authentication is enabled
              </div>
              <Button variant="outline" onClick={() => setShowUnenrollConfirm(true)}>
                <ShieldOff className="h-4 w-4 mr-2" />
                Disable 2FA
              </Button>
            </div>
          ) : enrolling && qrCode ? (
            <div className="space-y-4 max-w-md">
              <p className="text-sm text-muted-foreground">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </p>
              <div className="flex justify-center p-4 bg-white rounded-lg border w-fit">
                <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
              </div>
              {totpSecret && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Or enter this secret manually:</p>
                  <code className="text-xs bg-muted px-2 py-1 rounded select-all break-all">{totpSecret}</code>
                </div>
              )}
              <div className="space-y-2">
                <Label>Enter the 6-digit code from your app</Label>
                <Input
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="max-w-[200px] text-center text-lg tracking-widest"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleVerifyMfa} disabled={verifying || verifyCode.length !== 6}>
                  {verifying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {verifying ? 'Verifying...' : 'Verify & Enable'}
                </Button>
                <Button variant="outline" onClick={cancelEnrollment}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={handleEnrollMfa}>
              <Shield className="h-4 w-4 mr-2" />
              {t('settings.enable2FA')}
            </Button>
          )}
        </div>
      </div>

      {/* Unenroll confirmation dialog */}
      <AlertDialog open={showUnenrollConfirm} onOpenChange={setShowUnenrollConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Two-Factor Authentication?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the extra layer of security from your account. You can re-enable it at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnenrollMfa} disabled={unenrolling}>
              {unenrolling ? 'Disabling...' : 'Yes, disable 2FA'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
