import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { playNotificationSound, unlockAudio } from '@/utils/notificationSound';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useTranslation } from 'react-i18next';

interface Notification {
  id: string;
  order_id: string | null;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export const TopBar = ({ title }: { title: string }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const handleFirstInteraction = () => {
      unlockAudio();
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('click', handleFirstInteraction);
    };
    window.addEventListener('touchstart', handleFirstInteraction, { once: true });
    window.addEventListener('click', handleFirstInteraction, { once: true });

    const fetchNotifications = async () => {
      const { data } = await supabase.from('notifications').select('*')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
      if (data) {
        setNotifications(data as Notification[]);
        setUnreadCount(data.filter((n: any) => !n.is_read).length);
      }
    };
    fetchNotifications();

    const channel = supabase.channel('notifications-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications(prev => [newNotif, ...prev]);
          setUnreadCount(prev => prev + 1);
          playNotificationSound();
        }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAsRead = async (notif: Notification) => {
    if (!notif.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    if (notif.order_id) navigate(`/order/${notif.order_id}`);
  };

  return (
    <div className="top-bar">
      <div className="flex items-center gap-2">
        {/* شعار برتقالي صغير */}
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
          style={{ background: 'linear-gradient(135deg, hsl(24 94% 55%), hsl(16 90% 48%))' }}>
          🛵
        </div>
        <h1 className="text-base font-bold">{title}</h1>
      </div>
      <div className="flex items-center gap-1">
        <Sheet>
          <SheetTrigger asChild>
            <button className="relative p-2 rounded-xl hover:bg-secondary transition-colors">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -left-0.5 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold"
                  style={{ background: 'hsl(24 94% 55%)' }}>
                  {unreadCount}
                </span>
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full max-w-[430px] bg-background p-0">
            <SheetHeader className="p-4 border-b border-border">
              <SheetTitle>{t('topBar.notifications')}</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto h-[calc(100vh-60px)]">
              {notifications.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{t('topBar.noNotifications')}</p>
              ) : (
                notifications.map(n => (
                  <button key={n.id} onClick={() => markAsRead(n)}
                    className={`w-full text-right p-4 border-b border-border hover:bg-card transition-colors ${!n.is_read ? 'border-r-2' : ''}`}
                    style={!n.is_read ? { borderRightColor: 'hsl(24 94% 55%)' } : {}}>
                    <p className="font-semibold text-sm">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {new Date(n.created_at).toLocaleString('ar-BH')}
                    </p>
                  </button>
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
