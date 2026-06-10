import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useTranslation } from 'react-i18next';

const Register = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const fullPhone = `+973${phone.replace(/^0+/, '')}`;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!phone.trim()) return;
    if (password.length < 8) {
      toast({ title: t('common.error'), description: t('auth.passwordMinError'), variant: 'destructive' });
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
      if (error) {
        toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: t('common.done'), description: t('auth.otpSent') });
      setStep('otp');
    } catch (err) {
      console.error('OTP send error:', err);
      toast({ title: t('common.error'), description: t('auth.registrationError'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: otp,
        type: 'sms',
      });

      if (error) {
        toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
        return;
      }

      if (!data.user) {
        toast({ title: t('common.error'), description: t('auth.accountCreateError'), variant: 'destructive' });
        return;
      }

      // Update password so user can also log in with phone+password later
      await supabase.auth.updateUser({ password });

      // Upsert profile with name and phone
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        name,
        phone: fullPhone,
      }, { onConflict: 'id' });

      if (profileError) {
        throw profileError;
      }

      toast({ title: t('common.done'), description: t('auth.accountCreated') });
    } catch (err) {
      console.error('Verification error:', err);
      const message = err instanceof Error ? err.message : t('auth.registrationError');
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container flex items-center justify-center min-h-screen px-6">
      <div className="absolute top-4 left-4">
        <LanguageToggle />
      </div>
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">{t('common.appName')}</h1>
          <p className="text-muted-foreground text-sm">
            {step === 'form' ? t('auth.createAccount') : t('auth.enterOtp')}
          </p>
        </div>

        {step === 'form' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <Input
              placeholder={t('auth.fullName')}
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="h-12 bg-card border-border"
            />
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
            <Input
              type="password"
              placeholder={t('auth.passwordHint')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              className="h-12 bg-card border-border"
              dir="ltr"
            />
            <Button type="submit" className="w-full h-12 rounded-xl" disabled={loading}>
              {loading ? t('common.loading') : t('auth.sendOtp')}
            </Button>
          </form>
        ) : (
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
            <Button type="button" variant="ghost" className="w-full" onClick={() => { setStep('form'); setOtp(''); }}>
              {t('common.back')}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="text-primary underline">{t('auth.login')}</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
