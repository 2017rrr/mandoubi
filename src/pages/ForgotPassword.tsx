import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useTranslation } from 'react-i18next';

type Step = 'phone' | 'otp' | 'password';

const ForgotPassword = () => {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // Use ref to persist step across re-renders caused by auth state changes
  const stepRef = useRef<Step>('phone');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const fullPhone = `+973${phone.replace(/^0+/, '')}`;

  const updateStep = (newStep: Step) => {
    stepRef.current = newStep;
    setStep(newStep);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
    setLoading(false);
    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: t('common.done'), description: t('auth.otpSent') });
    updateStep('otp');
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ phone: fullPhone, token: otp, type: 'sms' });
    setLoading(false);
    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
      return;
    }
    // Important: move to password step, do NOT navigate away
    // verifyOtp creates a session which we need for updateUser
    updateStep('password');
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast({ title: t('common.error'), description: t('auth.passwordMinError'), variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: t('common.error'), description: t('auth.passwordMismatch'), variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setLoading(false);
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
      return;
    }
    await supabase.auth.signOut();
    setLoading(false);
    toast({ title: t('common.done'), description: t('auth.passwordChanged') });
    navigate('/login');
  };

  // Use ref value to be resilient against re-renders
  const currentStep = stepRef.current;

  return (
    <div className="app-container flex items-center justify-center min-h-screen px-6">
      <div className="absolute top-4 left-4">
        <LanguageToggle />
      </div>
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">{t('common.appName')}</h1>
          <p className="text-muted-foreground text-sm">{t('auth.forgotPassword')}</p>
        </div>

        {currentStep === 'phone' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="relative">
              <Input
                type="tel"
                placeholder={t('auth.phone')}
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                required
                className="h-12 bg-card border-border pr-20"
                dir="ltr"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">🇧🇭 +973</span>
            </div>
            <Button type="submit" className="w-full h-12 rounded-xl" disabled={loading}>
              {loading ? t('common.loading') : t('auth.sendOtp')}
            </Button>
          </form>
        )}

        {currentStep === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <p className="text-center text-sm text-muted-foreground">
              {t('auth.otpSentTo')} <span dir="ltr" className="font-mono">{fullPhone}</span>
            </p>
            <div className="flex justify-center" dir="ltr">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button type="submit" className="w-full h-12 rounded-xl" disabled={loading || otp.length !== 6}>
              {loading ? t('common.loading') : t('auth.verifyOtp')}
            </Button>
          </form>
        )}

        {currentStep === 'password' && (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <Input
              type="password"
              placeholder={t('auth.newPassword')}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="h-12 bg-card border-border"
              dir="ltr"
            />
            <Input
              type="password"
              placeholder={t('auth.confirmPassword')}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="h-12 bg-card border-border"
              dir="ltr"
            />
            <Button type="submit" className="w-full h-12 rounded-xl" disabled={loading}>
              {loading ? t('common.loading') : t('auth.changePassword')}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          <Link to="/login" className="text-primary underline">{t('auth.login')}</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
