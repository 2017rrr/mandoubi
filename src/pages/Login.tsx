import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

const Login = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
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
      return;
    }
  };

  return (
    <div className="app-container flex flex-col min-h-screen">
      {/* خلفية متدرجة علوية */}
      <div className="absolute inset-x-0 top-0 h-64 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% -20%, hsl(24 94% 55% / 0.15) 0%, transparent 70%)' }} />

      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {/* الشعار */}
        <div className="mb-10 text-center space-y-3">
          <div className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center text-4xl"
            style={{ background: 'linear-gradient(135deg, hsl(24 94% 55%), hsl(16 90% 48%))', boxShadow: '0 8px 32px hsl(24 94% 55% / 0.4)' }}>
            🛵
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight"
            style={{ background: 'linear-gradient(135deg, hsl(24 94% 65%), hsl(16 90% 55%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            مندوبي
          </h1>
          <p className="text-muted-foreground text-sm">{t('auth.login')}</p>
        </div>

        {/* النموذج */}
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-3">
          <div className="relative">
            <Input
              type="tel"
              placeholder={t('auth.phone')}
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
              required
              className="h-13 bg-card border-border pr-20 rounded-xl text-base"
              style={{ height: '52px' }}
              dir="ltr"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">🇧🇭 +973</span>
          </div>

          <Input
            type="password"
            placeholder={t('auth.password')}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="h-13 bg-card border-border rounded-xl text-base"
            style={{ height: '52px' }}
            dir="ltr"
          />

          <Button
            type="submit"
            className="w-full rounded-xl font-bold text-base"
            style={{ height: '52px', background: 'linear-gradient(135deg, hsl(24 94% 55%), hsl(16 90% 48%))', boxShadow: '0 4px 20px hsl(24 94% 55% / 0.4)' }}
            disabled={loading}
          >
            {loading ? t('common.loading') : t('auth.login')}
          </Button>
        </form>

        <div className="mt-6 space-y-3 text-center">
          <p className="text-sm">
            <Link to="/forgot-password" className="text-primary underline">{t('auth.forgotPassword')}؟</Link>
          </p>
          <p className="text-sm text-muted-foreground">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-primary font-semibold underline">{t('auth.register')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
