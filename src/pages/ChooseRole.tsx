import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useTranslation } from 'react-i18next';

const ADMIN_PHONE = '+97339105085';

const ChooseRole = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    const promoteAdminIfMatch = async () => {
      if (!user) return;
      if (user.phone && `+${user.phone}` === ADMIN_PHONE) {
        await supabase.from('profiles').update({ role: 'admin' }).eq('id', user.id);
        await refreshProfile();
        navigate('/admin');
      }
    };
    promoteAdminIfMatch();
  }, [user, refreshProfile, navigate]);

  const selectRole = async (role: 'store' | 'driver') => {
    if (!user) return;

    const { error: roleError } = await supabase.from('profiles').update({ role }).eq('id', user.id);
    if (roleError) {
      toast({ title: t('common.error'), description: roleError.message, variant: 'destructive' });
      return;
    }

    if (role === 'store') {
      const { error: storeError } = await supabase
        .from('stores')
        .upsert({ user_id: user.id, store_name: '', location_text: '' }, { onConflict: 'user_id' });

      if (storeError) {
        toast({ title: t('common.error'), description: storeError.message, variant: 'destructive' });
        return;
      }

      await refreshProfile();
      navigate('/store');
      return;
    }

    const { error: driverError } = await supabase
      .from('drivers')
      .upsert({ user_id: user.id, vehicle_type: 'pickup' }, { onConflict: 'user_id' });

    if (driverError) {
      toast({ title: t('common.error'), description: driverError.message, variant: 'destructive' });
      return;
    }

    await refreshProfile();
    navigate('/driver');
  };

  return (
    <div className="app-container flex items-center justify-center min-h-screen px-6">
      <div className="absolute top-4 left-4">
        <LanguageToggle />
      </div>
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">{t('chooseRole.title')}</h1>
          <p className="text-muted-foreground text-sm">{t('chooseRole.subtitle')}</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => selectRole('store')}
            className="w-full bg-card border border-border rounded-2xl p-6 text-right hover:border-primary transition-colors active:scale-[0.98]"
          >
            <span className="text-4xl">🏪</span>
            <h2 className="text-lg font-bold mt-3">{t('chooseRole.store')}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t('chooseRole.storeDesc')}</p>
          </button>

          <button
            onClick={() => selectRole('driver')}
            className="w-full bg-card border border-border rounded-2xl p-6 text-right hover:border-primary transition-colors active:scale-[0.98]"
          >
            <span className="text-4xl">🚗</span>
            <h2 className="text-lg font-bold mt-3">{t('chooseRole.driver')}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t('chooseRole.driverDesc')}</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChooseRole;
