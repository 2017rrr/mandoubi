import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

const Register = () => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const fullPhone = `+973${phone.replace(/^0+/, '')}`;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({ phone: fullPhone, password });
    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } else {
      setStep('otp');
      toast({ title: t('auth.otpSent') });
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ phone: fullPhone, token: otp, type: 'sms' });
    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }
    if (name) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from('profiles').update({ name, phone: fullPhone }).eq('id', user.id);
    }
    navigate('/choose-role');
    setLoading(false);
  };

  return (
    <div className="app-container flex flex-col min-h-screen">
      <div className="absolute inset-x-0 top-0 h-64 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% -20%, hsl(24 94% 55% / 0.15) 0%, transparent 70%)' }} />

      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        <div className="mb-10 text-center space-y-3">
          <div className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center text-4xl"
            style={{ background: 'linear-gradient(135deg, hsl(24 94% 55%), hsl(16 90% 48%))', boxShadow: '0 8px 32px hsl(24 94% 55% / 0.4)' }}>
            🛵
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight"
            style={{ background: 'linear-gradient(135deg, hsl(24 94% 65%), hsl(16 90% 55%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            مندوبي
          </h1>
          <p className="text-muted-foreground text-sm">{t('auth.register')}</p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="w-full max-w-sm space-y-3">
            <Input placeholder={t('auth.name')} value={name} onChange={e => setName(e.target.value)}
              className="bg-card rounded-xl" style={{ height: '52px' }} />
            <div className="relative">
              <Input type="tel" placeholder={t('auth.phone')} value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} required
                className="bg-card border-border pr-20 rounded-xl" style={{ height: '52px' }} dir="ltr" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">🇧🇭 +973</span>
            </div>
            <Input type="password" placeholder={t('auth.password')} value={password}
              onChange={e => setPassword(e.target.value)} required
              className="bg-card border-border rounded-xl" style={{ height: '52px' }} dir="ltr" />
            <Button type="submit" className="w-full rounded-xl font-bold text-base" disabled={loading}
              style={{ height: '52px', background: 'linear-gradient(135deg, hsl(24 94% 55%), hsl(16 90% 48%))', boxShadow: '0 4px 20px hsl(24 94% 55% / 0.4)' }}>
              {loading ? t('common.loading') : t('auth.sendOtp')}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="w-full max-w-sm space-y-3">
            <p className="text-center text-sm text-muted-foreground">{t('auth.otpSentTo')} {fullPhone}</p>
            <Input type="text" placeholder={t('auth.otpCode')} value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} required maxLength={6}
              className="bg-card border-border rounded-xl text-center text-2xl tracking-widest" style={{ height: '60px' }} dir="ltr" />
            <Button type="submit" className="w-full rounded-xl font-bold text-base" disabled={loading}
              style={{ height: '52px', background: 'linear-gradient(135deg, hsl(24 94% 55%), hsl(16 90% 48%))', boxShadow: '0 4px 20px hsl(24 94% 55% / 0.4)' }}>
              {loading ? t('common.loading') : t('auth.verify')}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="text-primary font-semibold underline">{t('auth.login')}</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
