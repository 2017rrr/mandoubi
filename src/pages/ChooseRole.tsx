import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

const ChooseRole = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleChoose = async (role: 'store' | 'driver') => {
    if (!user) return;
    setLoading(true);
    await supabase.from('profiles').update({ role }).eq('id', user.id);
    if (role === 'store') {
      await supabase.from('stores').upsert({ user_id: user.id }, { onConflict: 'user_id' });
    } else {
      await supabase.from('drivers').upsert({ user_id: user.id }, { onConflict: 'user_id' });
    }
    await refreshProfile();
    navigate(role === 'store' ? '/store' : '/driver');
    setLoading(false);
  };

  return (
    <div className="app-container flex flex-col min-h-screen">
      <div className="absolute inset-x-0 top-0 h-64 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% -20%, hsl(24 94% 55% / 0.12) 0%, transparent 70%)' }} />

      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        <div className="mb-10 text-center space-y-2">
          <h1 className="text-3xl font-extrabold">{t('role.title')}</h1>
          <p className="text-muted-foreground text-sm">{t('role.subtitle')}</p>
        </div>

        <div className="w-full max-w-sm space-y-4">
          {/* بطاقة صاحب المحل */}
          <button onClick={() => handleChoose('store')} disabled={loading}
            className="w-full p-6 rounded-2xl border border-border bg-card text-right transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ boxShadow: '0 4px 20px hsl(20 18% 0% / 0.3)' }}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, hsl(24 94% 55% / 0.2), hsl(16 90% 48% / 0.1))', border: '1px solid hsl(24 94% 55% / 0.3)' }}>
                🏪
              </div>
              <div>
                <p className="font-bold text-lg">{t('role.store')}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{t('role.storeDesc') || 'اطلب مندوبًا لتوصيل منتجاتك'}</p>
              </div>
            </div>
          </button>

          {/* بطاقة المندوب */}
          <button onClick={() => handleChoose('driver')} disabled={loading}
            className="w-full p-6 rounded-2xl border text-right transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, hsl(24 94% 55% / 0.12), hsl(16 90% 48% / 0.06))', borderColor: 'hsl(24 94% 55% / 0.4)', boxShadow: '0 4px 24px hsl(24 94% 55% / 0.15)' }}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, hsl(24 94% 55%), hsl(16 90% 48%))' }}>
                🛵
              </div>
              <div>
                <p className="font-bold text-lg text-primary">{t('role.driver')}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{t('role.driverDesc') || 'استلم طلبات ووصّل واكسب'}</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChooseRole;
