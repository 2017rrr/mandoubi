import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { OrderCard } from '@/components/OrderCard';
import StoreNewOrder from './StoreNewOrder';
import StoreProfile from './StoreProfile';
import { useTranslation } from 'react-i18next';

const StoreOrders = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [orders, setOrders] = useState<any[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchOrders = async () => {
      let { data: store } = await supabase.from('stores').select('id').eq('user_id', user.id).single();
      if (!store) {
        const { data: newStore } = await supabase.from('stores').insert({ user_id: user.id }).select('id').single();
        store = newStore;
      }
      if (!store) return;
      setStoreId(store.id);
      const { data } = await supabase.from('orders').select('*').eq('store_id', store.id).order('created_at', { ascending: false });
      if (data) setOrders(data);
    };
    fetchOrders();

    const channel = supabase
      .channel('store-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { fetchOrders(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <div className="page-content space-y-3">
      {orders.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">{t('store.noOrders')}</p>
      ) : (
        orders.map(order => <OrderCard key={order.id} order={order} />)
      )}
    </div>
  );
};

const StoreDashboard = () => {
  const { t } = useTranslation();

  const STORE_NAV = [
    { icon: '📦', label: t('nav.myOrders'), path: '/store' },
    { icon: '➕', label: t('nav.newOrder'), path: '/store/new' },
    { icon: '👤', label: t('nav.myAccount'), path: '/store/profile' },
  ];

  return (
    <div className="app-container">
      <TopBar title={t('topBar.store')} />
      <Routes>
        <Route index element={<StoreOrders />} />
        <Route path="new" element={<StoreNewOrder />} />
        <Route path="profile" element={<StoreProfile />} />
      </Routes>
      <BottomNav items={STORE_NAV} />
    </div>
  );
};

export default StoreDashboard;
