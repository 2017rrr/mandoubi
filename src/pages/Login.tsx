import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { LanguageToggle } from '@/components/LanguageToggle';
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
    // Navigation is handled by AuthContext after profile fetch
  };

  return (
    <div className="app-container flex items-center justify-center min-h-screen px-6">
      <div className="absolute top-4 left-4">
        <LanguageToggle />
      </div>
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">{t('common.appName')}</h1>
          <p className="text-muted-foreground text-sm">{t('auth.login')}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
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
            placeholder={t('auth.password')}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="h-12 bg-card border-border"
            dir="ltr"
          />
          <Button type="submit" className="w-full h-12 rounded-xl" disabled={loading}>
            {loading ? t('common.loading') : t('auth.login')}
          </Button>
        </form>

        <p className="text-center text-sm">
          <Link to="/forgot-password" className="text-primary underline">{t('auth.forgotPassword')}؟</Link>
        </p>

        <p className="text-center text-sm text-muted-foreground">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="text-primary underline">{t('auth.register')}</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
