import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';


const StoreProfile = () => {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [storeName, setStoreName] = useState('');
  const [locationText, setLocationText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('stores').select('*').eq('user_id', user.id).single().then(({ data }) => {
      if (data) {
        setStoreName(data.store_name || '');
        setLocationText(data.location_text || '');
      }
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    await supabase.from('stores').update({ store_name: storeName, location_text: locationText }).eq('user_id', user.id);
    toast({ title: t('common.done') });
    setLoading(false);
  };

  return (
    <div className="page-content space-y-6">
      <h2 className="text-lg font-bold">👤 {t('nav.myAccount')}</h2>

      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <div>
          <label className="text-xs text-muted-foreground">{t('store.name')}</label>
          <p className="font-medium">{profile?.name}</p>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">{t('store.phoneLabel')}</label>
          <p className="font-medium" dir="ltr">{profile?.phone}</p>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">{t('store.emailLabel')}</label>
          <p className="font-medium" dir="ltr">{user?.email}</p>
        </div>
      </div>

      <div className="space-y-3">
        <Input placeholder={t('store.storeName')} value={storeName} onChange={e => setStoreName(e.target.value)} className="h-12 bg-card" />
        <Input placeholder={t('store.address')} value={locationText} onChange={e => setLocationText(e.target.value)} className="h-12 bg-card" />
        <Button onClick={handleSave} className="w-full h-12 rounded-xl" disabled={loading}>
          {loading ? t('common.saving') : t('common.save')}
        </Button>
      </div>

      <a href="https://t.me/Mandoubi_bot" target="_blank" rel="noopener noreferrer">
        <Button variant="outline" className="w-full h-12 rounded-xl gap-2">
          <span>✈️</span> تواصل معنا عبر تلغرام
        </Button>
      </a>

      <Button onClick={signOut} variant="destructive" className="w-full h-12 rounded-xl">
        {t('common.logout')}
      </Button>
    </div>
  );
};

export default StoreProfile;
