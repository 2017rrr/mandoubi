import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { CarLogo } from '@/components/CarLogo';
import { LanguageToggle } from '@/components/LanguageToggle';

const Login = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const fullPhone = `+973${phone.replace(/^0+/, '')}`;
    const { error } = await supabase.auth.signInWithPassword({ phone: fullPhone, password });
    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
      setLoading(false);
    }
  };

  return (
    <div className="app-container flex flex-col min-h-screen overflow-hidden">
      <div className="page-glow" />
      <div className="absolute top-4 left-4 z-20">
        <LanguageToggle />
      </div>

      {/* قسم الشعار */}
      <div className="flex-1 flex flex-col justify-center px-6 relative z-10">
        <div className="mb-12 flex flex-col items-center gap-5">
          {/* أيقونة السيارة */}
          <div
            className="w-24 h-24 rounded-[28px] flex items-center justify-center"
            style={{
              background: 'linear-gradient(145deg, hsl(22 100% 55%), hsl(16 95% 45%))',
              boxShadow: '0 12px 40px hsl(22 100% 55% / 0.45), 0 0 0 1px hsl(22 100% 55% / 0.2)',
            }}
          >
            <CarLogo size={60} color="white" />
          </div>

          {/* الاسم */}
          <div className="text-center space-y-1">
            <h1
              className="text-5xl font-black tracking-tight"
              style={{
                background: 'linear-gradient(135deg, #fff 30%, hsl(22 100% 70%))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              مندوبي
            </h1>
            <p className="text-muted-foreground text-sm font-medium">{t('common.tagline')}</p>
          </div>
        </div>

        {/* نموذج الدخول */}
        <form onSubmit={handleLogin} className="space-y-3 w-full max-w-sm mx-auto">
          <div className="relative">
            <input
              type="tel"
              placeholder={t('auth.phone')}
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
              required
              className="input-field pr-20 text-left"
              style={{ direction: 'ltr', textAlign: 'left', paddingRight: '80px' }}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold select-none">
              🇧🇭 +973
            </span>
          </div>

          <input
            type="password"
            placeholder={t('auth.password')}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="input-field"
            style={{ direction: 'ltr' }}
          />

          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex items-center justify-center text-base mt-2"
            style={{ height: '52px', width: '100%', borderRadius: '14px' }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                {t('common.loading')}
              </span>
            ) : t('auth.login')}
          </button>
        </form>

        <div className="mt-6 space-y-2 text-center">
          <p className="text-sm">
            <Link to="/forgot-password" className="text-muted-foreground hover:text-primary transition-colors">
              {t('auth.forgotPassword')}؟
            </Link>
          </p>
          <p className="text-sm text-muted-foreground">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-primary font-bold">
              {t('auth.register')}
            </Link>
          </p>
        </div>
      </div>

      {/* خط سفلي */}
      <div
        className="h-1 mx-8 mb-8 rounded-full opacity-40"
        style={{ background: 'linear-gradient(90deg, transparent, hsl(22 100% 55%), transparent)' }}
      />
    </div>
  );
};

export default Login;
