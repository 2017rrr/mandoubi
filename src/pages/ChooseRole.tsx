import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CarLogo } from '@/components/CarLogo';
import { LanguageToggle } from '@/components/LanguageToggle';

const ChooseRole = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<'store' | 'driver' | null>(null);

  const handleChoose = async (role: 'store' | 'driver') => {
    if (!user || loading) return;
    setSelected(role);
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
      <div className="page-glow" />
      <div className="absolute top-4 left-4 z-20">
        <LanguageToggle />
      </div>

      <div className="flex-1 flex flex-col justify-center px-5 relative z-10 gap-8">
        {/* العنوان */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(145deg, hsl(22 100% 55%), hsl(16 95% 45%))', boxShadow: '0 8px 28px hsl(22 100% 55% / 0.4)' }}
            >
              <CarLogo size={40} color="white" />
            </div>
          </div>
          <h1 className="text-3xl font-black">{t('chooseRole.title')}</h1>
          <p className="text-muted-foreground text-sm">{t('chooseRole.subtitle')}</p>
        </div>

        {/* الخيارات */}
        <div className="space-y-3 w-full max-w-sm mx-auto">
          {/* صاحب المحل */}
          <button
            onClick={() => handleChoose('store')}
            disabled={loading}
            className="w-full p-5 rounded-2xl text-right transition-all duration-200 active:scale-[0.97]"
            style={{
              background: selected === 'store'
                ? 'linear-gradient(135deg, hsl(22 100% 55% / 0.18), hsl(16 95% 48% / 0.08))'
                : 'hsl(20 22% 9%)',
              border: `1.5px solid ${selected === 'store' ? 'hsl(22 100% 55% / 0.5)' : 'hsl(20 20% 100% / 0.07)'}`,
              boxShadow: selected === 'store' ? '0 4px 24px hsl(22 100% 55% / 0.18)' : 'none',
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                style={{ background: 'hsl(20 22% 14%)' }}
              >
                🏪
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg">{t('chooseRole.store')}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{t('chooseRole.storeDesc')}</p>
              </div>
              <div
                className="w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all"
                style={{
                  borderColor: selected === 'store' ? 'hsl(22 100% 55%)' : 'hsl(20 20% 100% / 0.2)',
                  background: selected === 'store' ? 'hsl(22 100% 55%)' : 'transparent',
                }}
              >
                {selected === 'store' && <span className="text-white text-xs">✓</span>}
              </div>
            </div>
          </button>

          {/* المندوب */}
          <button
            onClick={() => handleChoose('driver')}
            disabled={loading}
            className="w-full p-5 rounded-2xl text-right transition-all duration-200 active:scale-[0.97]"
            style={{
              background: selected === 'driver'
                ? 'linear-gradient(135deg, hsl(22 100% 55% / 0.18), hsl(16 95% 48% / 0.08))'
                : 'hsl(20 22% 9%)',
              border: `1.5px solid ${selected === 'driver' ? 'hsl(22 100% 55% / 0.5)' : 'hsl(20 20% 100% / 0.07)'}`,
              boxShadow: selected === 'driver' ? '0 4px 24px hsl(22 100% 55% / 0.18)' : 'none',
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(145deg, hsl(22 100% 55%), hsl(16 95% 45%))', boxShadow: '0 4px 16px hsl(22 100% 55% / 0.35)' }}
              >
                <CarLogo size={36} color="white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg text-primary">{t('chooseRole.driver')}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{t('chooseRole.driverDesc')}</p>
              </div>
              <div
                className="w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all"
                style={{
                  borderColor: selected === 'driver' ? 'hsl(22 100% 55%)' : 'hsl(20 20% 100% / 0.2)',
                  background: selected === 'driver' ? 'hsl(22 100% 55%)' : 'transparent',
                }}
              >
                {selected === 'driver' && <span className="text-white text-xs">✓</span>}
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChooseRole;
