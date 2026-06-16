import { Bell, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { playNotificationSound, unlockAudio } from '@/utils/notificationSound';
import { useNavigate } from 'react-router-dom';
import { CarLogo } from '@/components/CarLogo';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from '@/components/LanguageToggle';

interface Notification {
  id: string; order_id: string | null; type: string;
  title: string; body: string; is_read: boolean; created_at: string;
}

export const TopBar = ({ title }: { title: string }) => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const unlock = () => { unlockAudio(); };
    window.addEventListener('touchstart', unlock, { once: true });
    window.addEventListener('click', unlock, { once: true });

    const fetch = async () => {
      const { data } = await supabase.from('notifications').select('*')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
      if (data) {
        setNotifications(data as Notification[]);
        setUnreadCount(data.filter((n: any) => !n.is_read).length);
      }
    };
    fetch();

    const ch = supabase.channel('notifs').on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
      (payload) => {
        const n = payload.new as Notification;
        setNotifications(p => [n, ...p]);
        setUnreadCount(p => p + 1);
        playNotificationSound();
      }).subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const markRead = async (n: Notification) => {
    if (!n.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
      setNotifications(p => p.map(x => x.id === n.id ? { ...x, is_read: true } : x));
      setUnreadCount(p => Math.max(0, p - 1));
    }
    setPanelOpen(false);
    if (n.order_id) navigate(`/order/${n.order_id}`);
  };

  return (
    <>
      <div className="top-bar">
        {/* الشعار + الاسم */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(145deg, hsl(22 100% 55%), hsl(16 95% 45%))' }}
          >
            <CarLogo size={22} color="white" />
          </div>
          <span className="font-bold text-sm tracking-wide">{title}</span>
        </div>

        {/* أزرار اللغة والإشعارات */}
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <button
            onClick={() => setPanelOpen(true)}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: 'hsl(20 22% 14%)' }}
          >
            <Bell className="w-4.5 h-4.5" size={18} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black text-white flex items-center justify-center"
                style={{ background: 'hsl(22 100% 55%)' }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* لوحة الإشعارات */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setPanelOpen(false)} />
          <div
            className="w-[85%] max-w-[360px] h-full flex flex-col"
            style={{ background: 'hsl(20 22% 6%)' }}
          >
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'hsl(20 20% 100% / 0.07)' }}>
              <h2 className="font-bold text-base">{t('topBar.notifications')}</h2>
              <button onClick={() => setPanelOpen(false)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'hsl(20 22% 14%)' }}>
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                  <Bell size={32} className="opacity-30" />
                  <p className="text-sm">{t('topBar.noNotifications')}</p>
                </div>
              ) : notifications.map(n => (
                <button key={n.id} onClick={() => markRead(n)}
                  className="w-full text-right p-4 transition-colors"
                  style={{
                    borderBottom: '1px solid hsl(20 20% 100% / 0.05)',
                    borderRight: n.is_read ? 'none' : '3px solid hsl(22 100% 55%)',
                    background: n.is_read ? 'transparent' : 'hsl(22 100% 55% / 0.04)',
                  }}>
                  <p className={`text-sm ${n.is_read ? 'text-muted-foreground' : 'font-semibold'}`}>{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1.5">{new Date(n.created_at).toLocaleString(i18n.language === 'ar' ? 'ar-BH' : 'en-GB')}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
