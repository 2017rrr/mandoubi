import { useEffect, useState, useMemo } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { supabase } from '@/integrations/supabase/client';
import { OrderCard } from '@/components/OrderCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PRICES, formatAmount, openMapPicker, type DeliveryType, type OrderStatus } from '@/utils/constants';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { getSignedUrl } from '@/utils/storageUtils';
import { useTranslation } from 'react-i18next';

const ORDER_STATUSES: OrderStatus[] = ['pending', 'awaiting_driver', 'driver_assigned', 'arrived_pickup', 'loaded', 'in_transit', 'delivered', 'cancelled'];

const AdminHome = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState({ today: 0, completed: 0, activeDrivers: 0, revenue: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const { data: orders } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (!orders) return;
      const todayOrders = orders.filter(o => new Date(o.created_at) >= todayStart);
      const { data: drivers } = await supabase.from('drivers').select('id').eq('is_available', true);
      setStats({
        today: todayOrders.length,
        completed: orders.filter(o => o.status === 'delivered').length,
        activeDrivers: drivers?.length || 0,
        revenue: todayOrders.reduce((s, o) => s + Number(o.amount), 0),
      });
      setRecentOrders(orders.slice(0, 5));
    };
    fetch();
  }, []);

  const statCards = [
    { label: t('admin.todayOrders'), value: stats.today, icon: '📦' },
    { label: t('admin.completed'), value: stats.completed, icon: '✅' },
    { label: t('admin.activeDrivers'), value: stats.activeDrivers, icon: '🚗' },
    { label: t('admin.todayRevenue'), value: formatAmount(stats.revenue), icon: '💰' },
  ];

  return (
    <div className="page-content space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {statCards.map(s => (
          <div key={s.label} className="bg-card rounded-2xl border border-border p-4">
            <span className="text-2xl">{s.icon}</span>
            <p className="text-xs text-muted-foreground mt-2">{s.label}</p>
            <p className="font-bold text-lg mt-1">{s.value}</p>
          </div>
        ))}
      </div>
      <h3 className="font-bold">{t('admin.recentOrders')}</h3>
      <div className="space-y-3">
        {recentOrders.map(o => <OrderCard key={o.id} order={o} />)}
      </div>
    </div>
  );
};

const AdminOrders = () => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const { toast } = useToast();

  const fetchOrders = async () => {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (data) setOrders(data);
  };

  useEffect(() => {
    fetchOrders();
    supabase.from('drivers').select('*, profiles:user_id(name)').then(({ data }) => {
      if (data) setDrivers(data);
    });
  }, []);

  // Keep selectedOrder in sync with orders list
  useEffect(() => {
    if (selectedOrder) {
      const fresh = orders.find(o => o.id === selectedOrder.id);
      if (fresh && fresh !== selectedOrder) setSelectedOrder(fresh);
    }
  }, [orders]);

  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (filter === 'active' && ['delivered', 'cancelled', 'pending'].includes(o.status)) return false;
      if (filter === 'pending' && o.status !== 'pending') return false;
      if (filter === 'completed' && o.status !== 'delivered') return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchNum = String(o.order_number).includes(q);
        const matchPhone = (o.client_phone || '').toLowerCase().includes(q);
        if (!matchNum && !matchPhone) return false;
      }
      return true;
    });
  }, [orders, filter, search]);

  const notifyOrderParties = async (order: any, title: string, body: string, type: string) => {
    const notifs: any[] = [];
    const { data: store } = await supabase.from('stores').select('user_id').eq('id', order.store_id).single();
    if (store) notifs.push({ user_id: store.user_id, order_id: order.id, type, title, body });
    if (order.driver_id) {
      const { data: driver } = await supabase.from('drivers').select('user_id').eq('id', order.driver_id).single();
      if (driver) notifs.push({ user_id: driver.user_id, order_id: order.id, type, title, body });
    }
    for (const n of notifs) await supabase.from('notifications').insert(n);
  };

  const assignDriver = async (orderId: string, driverId: string, orderNumber: number) => {
    const order = orders.find(o => o.id === orderId);
    const isReplacement = order?.driver_id && order.driver_id !== driverId;
    await supabase.from('orders').update({ driver_id: driverId, status: 'driver_assigned' }).eq('id', orderId);
    if (order) {
      const { data: store } = await supabase.from('stores').select('user_id').eq('id', order.store_id).single();
      const driver = drivers.find(d => d.id === driverId);
      const titleStore = isReplacement ? 'تم تغيير السائق' : 'تم تعيين سائق';
      if (store) await supabase.from('notifications').insert({ user_id: store.user_id, order_id: orderId, type: 'order_assigned', title: titleStore, body: `${titleStore} للطلب #${orderNumber}` });
      if (driver) await supabase.from('notifications').insert({ user_id: driver.user_id, order_id: orderId, type: 'order_assigned', title: 'طلب جديد لك', body: `تم تعيينك للطلب #${orderNumber}` });
    }
    toast({ title: t('admin.driverAssigned') });
    fetchOrders();
  };

  const changeStatus = async (orderId: string, newStatus: string) => {
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    const order = orders.find(o => o.id === orderId);
    if (order) {
      await notifyOrderParties(order, 'تحديث حالة الطلب', `الطلب #${order.order_number}: ${t(`status.${newStatus}`)}`, 'status_changed');
    }
    toast({ title: t('admin.statusUpdated') });
    fetchOrders();
  };

  const deleteOrder = async (orderId: string) => {
    const { error } = await supabase.from('orders').delete().eq('id', orderId);
    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: t('admin.orderDeleted') });
    setDeleteConfirmOpen(false);
    setSheetOpen(false);
    fetchOrders();
  };

  const filters = [
    { key: 'all', label: t('admin.all') },
    { key: 'active', label: t('admin.activeFilter') },
    { key: 'pending', label: t('admin.pendingFilter') },
    { key: 'completed', label: t('admin.completedFilter') },
  ];

  const currentDriverName = selectedOrder?.driver_id
    ? drivers.find(d => d.id === selectedOrder.driver_id)?.profiles?.name || t('admin.driverRole')
    : null;

  return (
    <div className="page-content space-y-4">
      <Input
        placeholder={t('admin.searchOrders')}
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="h-11 bg-card"
      />
      <div className="flex gap-2 overflow-x-auto pb-2">
        {filters.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${filter === f.key ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}>
            {f.label}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {filtered.map(o => (
          <div key={o.id} className="space-y-2">
            <OrderCard order={o} onClick={() => { setSelectedOrder(o); setSheetOpen(true); }} />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => { setSelectedOrder(o); setSheetOpen(true); }}>
                ⚙️ {t('admin.changeStatus')}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => { setSelectedOrder(o); setDeleteConfirmOpen(true); }}>
                🗑 {t('admin.deleteOrder')}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="bg-background rounded-t-2xl max-h-[85vh] overflow-y-auto">
          {selectedOrder && (
            <div className="space-y-4 p-2">
              <SheetHeader>
                <SheetTitle>{t('nav.orders')} #{selectedOrder.order_number}</SheetTitle>
              </SheetHeader>
              <div className="space-y-2 text-sm">
                <p>📍 {t('common.from')} {selectedOrder.pickup_address}</p>
                <p>📍 {t('common.to')} {selectedOrder.delivery_address}</p>
                <p>{t('admin.type')} {t('common.standard')}</p>
                <p>💰 {t('common.amount')}: {formatAmount(selectedOrder.amount)}</p>
                <p>{t('admin.client')} {selectedOrder.client_phone}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('admin.changeStatus')}</label>
                <select
                  value={selectedOrder.status}
                  onChange={e => changeStatus(selectedOrder.id, e.target.value)}
                  className="w-full h-12 rounded-xl bg-card border border-border px-4 text-foreground"
                >
                  {ORDER_STATUSES.map(s => (
                    <option key={s} value={s}>{t(`status.${s}`)}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t('admin.currentDriver')}: <span className="text-muted-foreground">{currentDriverName || t('admin.noDriverAssigned')}</span>
                </label>
                <select
                  onChange={e => e.target.value && assignDriver(selectedOrder.id, e.target.value, selectedOrder.order_number)}
                  className="w-full h-12 rounded-xl bg-card border border-border px-4 text-foreground"
                  value=""
                >
                  <option value="" disabled>{selectedOrder.driver_id ? t('admin.changeDriver') : t('admin.chooseDriver')}</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {(d as any).profiles?.name || t('admin.driverRole')}
                    </option>
                  ))}
                </select>
              </div>

              <Button variant="outline" className="w-full" onClick={() => window.location.href = `/order/${selectedOrder.id}`}>
                {t('admin.orderChat')}
              </Button>

              <Button variant="destructive" className="w-full" onClick={() => setDeleteConfirmOpen(true)}>
                🗑 {t('admin.deleteOrder')}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.deleteOrder')}</AlertDialogTitle>
            <AlertDialogDescription>{t('admin.confirmDeleteOrder')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => selectedOrder && deleteOrder(selectedOrder.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('admin.deleteOrder')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const AdminUsers = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<any[]>([]);
  const [driverRecords, setDriverRecords] = useState<Record<string, any>>({});
  const [filter, setFilter] = useState('all');
  const [broadcastOpen, setBroadcastOpen] = useState<null | 'driver' | 'store'>(null);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data);
    const { data: dRecs } = await supabase.from('drivers').select('id, user_id, is_available');
    if (dRecs) {
      const map: Record<string, any> = {};
      dRecs.forEach(d => { map[d.user_id] = d; });
      setDriverRecords(map);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const filtered = users.filter(u => {
    if (filter === 'store') return u.role === 'store';
    if (filter === 'driver') return u.role === 'driver';
    return true;
  });

  const changeRole = async (userId: string, newRole: string) => {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    toast({ title: t('admin.roleUpdated') });
  };

  const toggleDriverAvailable = async (userId: string) => {
    const rec = driverRecords[userId];
    if (!rec) return;
    const newVal = !rec.is_available;
    await supabase.from('drivers').update({ is_available: newVal }).eq('id', rec.id);
    setDriverRecords(prev => ({ ...prev, [userId]: { ...rec, is_available: newVal } }));
    toast({ title: t('admin.statusToggled') });
  };

  const deleteUser = async (userId: string, name: string) => {
    if (!confirm(t('admin.confirmDeleteUser', { name: name || userId }))) return;
    const { error } = await supabase.functions.invoke('admin-delete-user', {
      body: { user_id: userId },
    });
    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
      return;
    }
    setUsers(prev => prev.filter(u => u.id !== userId));
    toast({ title: t('admin.userDeleted') });
  };

  const sendBroadcast = async () => {
    if (!broadcastOpen || !broadcastMsg.trim()) return;
    setSending(true);
    const { data: ids, error } = await supabase.rpc('get_user_ids_by_role', { target_role: broadcastOpen });
    if (error || !ids) {
      toast({ title: t('common.error'), description: error?.message, variant: 'destructive' });
      setSending(false);
      return;
    }
    for (const u of ids as any[]) {
      await supabase.from('notifications').insert({
        user_id: u.id,
        order_id: null,
        type: 'broadcast',
        title: t('admin.broadcastTitle'),
        body: broadcastMsg.trim(),
      });
    }
    toast({ title: t('admin.broadcastSent') });
    setBroadcastMsg('');
    setBroadcastOpen(null);
    setSending(false);
  };

  return (
    <div className="page-content space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => setBroadcastOpen('driver')}>{t('admin.broadcastDrivers')}</Button>
        <Button variant="outline" onClick={() => setBroadcastOpen('store')}>{t('admin.broadcastStores')}</Button>
      </div>
      <div className="flex gap-2">
        {[
          { key: 'all', label: t('admin.all') },
          { key: 'store', label: t('admin.storeRole') },
          { key: 'driver', label: t('admin.driverRole') },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm ${filter === f.key ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}>
            {f.label}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {filtered.map(u => {
          const dRec = driverRecords[u.id];
          return (
            <div key={u.id} className="bg-card rounded-2xl border border-border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium">{u.name}</p>
                {u.role === 'driver' && dRec && (
                  <span className={`status-badge ${dRec.is_available ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                    {dRec.is_available ? `🟢 ${t('admin.available')}` : `🔴 ${t('admin.suspended')}`}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground" dir="ltr">{u.phone}</p>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="status-badge bg-primary/20 text-primary">{u.role || t('admin.noRole')}</span>
                <div className="flex items-center gap-2">
                  {u.role === 'driver' && dRec && (
                    <Button size="sm" variant="outline" onClick={() => toggleDriverAvailable(u.id)}>
                      {dRec.is_available ? `🔴 ${t('admin.suspended')}` : `🟢 ${t('admin.available')}`}
                    </Button>
                  )}
                  <select value={u.role || ''} onChange={e => changeRole(u.id, e.target.value)}
                    className="text-xs bg-card border border-border rounded-lg px-2 py-1 text-foreground">
                    <option value="store">{t('admin.storeRole')}</option>
                    <option value="driver">{t('admin.driverRole')}</option>
                    <option value="admin">{t('admin.adminRole')}</option>
                  </select>
                  <Button size="sm" variant="destructive" onClick={() => deleteUser(u.id, u.name)}>
                    {t('admin.deleteUser')}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!broadcastOpen} onOpenChange={(o) => !o && setBroadcastOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {broadcastOpen === 'driver' ? t('admin.broadcastDrivers') : t('admin.broadcastStores')}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            value={broadcastMsg}
            onChange={e => setBroadcastMsg(e.target.value)}
            placeholder={t('admin.broadcastPlaceholder')}
            className="min-h-[120px] bg-card"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBroadcastOpen(null)}>{t('common.cancel')}</Button>
            <Button onClick={sendBroadcast} disabled={sending || !broadcastMsg.trim()}>{t('admin.sendBroadcast')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AdminPayments = () => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<any[]>([]);
  const [receiptUrls, setReceiptUrls] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const fetchPayments = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, stores(store_name, user_id, profiles:user_id(phone))')
      .not('receipt_url', 'is', null)
      .order('created_at', { ascending: false });
    if (data) {
      setOrders(data);
      // جلب signed URLs لكل الإيصالات
      const urls: Record<string, string> = {};
      for (const o of data) {
        if (o.receipt_url) {
          const url = await getSignedUrl('receipts', o.receipt_url);
          if (url) urls[o.id] = url;
        }
      }
      setReceiptUrls(urls);
    }
  };

  useEffect(() => { fetchPayments(); }, []);

  const handlePayment = async (orderId: string, status: 'confirmed' | 'rejected', orderNumber: number) => {
    await supabase.from('orders').update({ payment_status: status }).eq('id', orderId);
    if (status === 'confirmed') {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        const { data: store } = await supabase.from('stores').select('user_id').eq('id', order.store_id).single();
        const notifs = [];
        if (store) notifs.push({ user_id: store.user_id, order_id: orderId, type: 'payment_confirmed', title: t('admin.paymentConfirmed'), body: `${t('admin.paymentConfirmed')} #${orderNumber}` });
        if (order.driver_id) {
          const { data: driver } = await supabase.from('drivers').select('user_id').eq('id', order.driver_id).single();
          if (driver) notifs.push({ user_id: driver.user_id, order_id: orderId, type: 'payment_confirmed', title: t('admin.paymentConfirmed'), body: `${t('admin.paymentConfirmed')} #${orderNumber}` });
        }
        for (const n of notifs) await supabase.from('notifications').insert(n);
      }
    }
    toast({ title: status === 'confirmed' ? t('admin.paymentConfirmed') : t('admin.paymentRejected') });
    fetchPayments();
  };

  const paymentStatusBadge = (status: string) => {
    if (status === 'confirmed') return <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success font-medium">✅ مؤكد</span>;
    if (status === 'rejected') return <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-medium">❌ مرفوض</span>;
    if (status === 'submitted') return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500 font-medium">⏳ بانتظار</span>;
    return <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{status}</span>;
  };

  return (
    <div className="page-content space-y-3">
      <h2 className="font-bold">{t('admin.pendingPayments')}</h2>
      {orders.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">{t('admin.noPendingPayments')}</p>
      ) : (
        orders.map(o => {
          const storePhone = (o.stores as any)?.profiles?.phone || '—';
          return (
            <div key={o.id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
              {/* رأس البطاقة */}
              <div className="flex justify-between items-center">
                <span className="font-medium">🧾 #{o.order_number}</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-primary">{formatAmount(o.amount)}</span>
                  {paymentStatusBadge(o.payment_status)}
                </div>
              </div>

              {/* رقم هاتف صاحب المحل */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">📞 صاحب المحل:</span>
                <a href={`tel:${storePhone}`} className="text-primary font-medium" dir="ltr">{storePhone}</a>
              </div>

              {/* نوع التوصيل والتاريخ */}
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t('common.standard')}</span>
                <span>{new Date(o.created_at).toLocaleString('ar-BH')}</span>
              </div>

              {/* صورة الإيصال مباشرة */}
              {receiptUrls[o.id] && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">صورة الإيصال:</p>
                  <img
                    src={receiptUrls[o.id]}
                    alt="إيصال"
                    className="w-full rounded-xl border border-border cursor-pointer"
                    onClick={() => window.open(receiptUrls[o.id], '_blank')}
                  />
                </div>
              )}

              {/* أزرار التأكيد والرفض فقط للطلبات المعلقة */}
              {o.payment_status === 'submitted' && (
                <div className="flex gap-2">
                  <Button className="flex-1 bg-success hover:bg-success/90" onClick={() => handlePayment(o.id, 'confirmed', o.order_number)}>{t('admin.confirmPayment')}</Button>
                  <Button variant="outline" className="flex-1 text-destructive" onClick={() => handlePayment(o.id, 'rejected', o.order_number)}>{t('admin.rejectPayment')}</Button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

const AdminReports = () => {
  const { t } = useTranslation();
  const [revenue, setRevenue] = useState({ total: 0, month: 0, week: 0, avg: 0 });
  const [storeStats, setStoreStats] = useState<any[]>([]);
  const [driverStats, setDriverStats] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: orders } = await supabase.from('orders').select('amount, status, created_at').eq('status', 'delivered');
      if (orders) {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
        const total = orders.reduce((s, o) => s + Number(o.amount), 0);
        const month = orders.filter(o => new Date(o.created_at) >= monthStart).reduce((s, o) => s + Number(o.amount), 0);
        const week = orders.filter(o => new Date(o.created_at) >= weekStart).reduce((s, o) => s + Number(o.amount), 0);
        const avg = orders.length ? total / orders.length : 0;
        setRevenue({ total, month, week, avg });
      }
      const { data: ss } = await (supabase as any).from('store_stats').select('*').order('total_orders', { ascending: false });
      if (ss) setStoreStats(ss);
      const { data: ds } = await (supabase as any).from('driver_stats').select('*').order('completed_orders', { ascending: false });
      if (ds) setDriverStats(ds);
    };
    load();
  }, []);

  const cards = [
    { label: t('admin.totalRevenue'), value: formatAmount(revenue.total), icon: '💰' },
    { label: t('admin.monthRevenue'), value: formatAmount(revenue.month), icon: '📅' },
    { label: t('admin.weekRevenue'), value: formatAmount(revenue.week), icon: '🗓' },
    { label: t('admin.avgOrderValue'), value: formatAmount(revenue.avg), icon: '📊' },
  ];

  return (
    <div className="page-content space-y-5">
      <h2 className="font-bold text-lg">{t('admin.reports')}</h2>
      <div className="grid grid-cols-2 gap-3">
        {cards.map(c => (
          <div key={c.label} className="bg-card rounded-2xl border border-border p-4">
            <span className="text-2xl">{c.icon}</span>
            <p className="text-xs text-muted-foreground mt-2">{c.label}</p>
            <p className="font-bold text-base mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="font-bold">{t('admin.topStores')}</h3>
        {storeStats.map(s => (
          <div key={s.store_id} className="bg-card rounded-2xl border border-border p-4 space-y-1">
            <p className="font-medium">{s.store_name || '—'}</p>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t('admin.totalOrders')}: <b className="text-foreground">{s.total_orders}</b></span>
              <span>{t('admin.completedOrders')}: <b className="text-foreground">{s.completed_orders}</b></span>
            </div>
            <p className="text-sm font-bold text-primary">{formatAmount(Number(s.total_revenue || 0))}</p>
          </div>
        ))}
        {storeStats.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">{t('common.noData')}</p>}
      </div>

      <div className="space-y-3">
        <h3 className="font-bold">{t('admin.driverPerformance')}</h3>
        {driverStats.map(d => (
          <div key={d.driver_id} className="bg-card rounded-2xl border border-border p-4 space-y-1">
            <div className="flex justify-between items-center">
              <p className="font-medium">{d.driver_name || '—'}</p>
              <span className="text-xs text-muted-foreground">{t('common.standard')}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t('admin.completedOrders')}: <b className="text-foreground">{d.completed_orders}</b></span>
              <span>⭐ {Number(d.rating || 0).toFixed(1)}</span>
            </div>
            <p className="text-sm font-bold text-primary">{formatAmount(Number(d.total_earnings || 0))}</p>
          </div>
        ))}
        {driverStats.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">{t('common.noData')}</p>}
      </div>
    </div>
  );
};

const AdminCreateOrder = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stores, setStores] = useState<any[]>([]);
  const [storeSearch, setStoreSearch] = useState('');
  const [storeId, setStoreId] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryType] = useState<DeliveryType>('standard');
  const [description, setDescription] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [pickupTime, setPickupTime] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: storeRows } = await supabase.from('stores').select('id, store_name, user_id').order('created_at', { ascending: false });
      if (!storeRows) return;
      const userIds = storeRows.map(s => s.user_id).filter(Boolean);
      const { data: profs } = await supabase.from('profiles').select('id, phone').in('id', userIds);
      const phoneMap: Record<string, string> = {};
      (profs || []).forEach(p => { phoneMap[p.id] = p.phone || ''; });
      setStores(storeRows.map(s => ({ ...s, phone: phoneMap[s.user_id] || '' })));
    })();
  }, []);

  const filteredStores = useMemo(() => {
    const q = storeSearch.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter(s =>
      (s.phone || '').toLowerCase().includes(q) ||
      (s.store_name || '').toLowerCase().includes(q)
    );
  }, [stores, storeSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return;
    setLoading(true);
    const amount = PRICES[deliveryType];
    const { data: order, error } = await supabase.from('orders').insert({
      store_id: storeId,
      client_phone: clientPhone,
      pickup_address: pickupAddress,
      delivery_address: deliveryAddress,
      delivery_type: deliveryType,
      amount,
      description,
      notes,
      pickup_time: pickupTime === 'scheduled' ? scheduledDate : 'immediate',
      payment_status: 'confirmed',
      status: 'pending',
    }).select().single();

    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    // Notify the store owner + admins
    const { data: storeRow } = await supabase.from('stores').select('user_id, store_name').eq('id', storeId).single();
    if (storeRow) {
      await supabase.from('notifications').insert({
        user_id: storeRow.user_id,
        order_id: order.id,
        type: 'new_order',
        title: 'طلب جديد',
        body: `طلب جديد #${order.order_number} من ${storeRow.store_name || ''}`,
      });
    }
    const { data: admins } = await supabase.rpc('get_admin_ids');
    if (admins) {
      for (const a of admins as any[]) {
        await supabase.from('notifications').insert({
          user_id: a.id,
          order_id: order.id,
          type: 'new_order',
          title: 'طلب جديد (أدمن)',
          body: `طلب #${order.order_number} أُنشئ من لوحة الأدمن`,
        });
      }
    }

    toast({ title: t('store.orderCreated'), description: `${t('store.orderNumber')} #${order.order_number}` });
    navigate('/admin/orders');
    setLoading(false);
  };

  return (
    <div className="page-content">
      <form onSubmit={handleSubmit} className="space-y-6">
        <h2 className="text-lg font-bold">{t('admin.createOrderForStore')}</h2>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('admin.chooseStore')}</label>
          <Input
            placeholder={t('admin.searchStorePhone')}
            value={storeSearch}
            onChange={e => setStoreSearch(e.target.value)}
            className="h-11 bg-card"
            dir="ltr"
          />
          <select
            value={storeId}
            onChange={e => setStoreId(e.target.value)}
            required
            className="w-full h-12 rounded-xl bg-card border border-border px-4 text-foreground"
          >
            <option value="" disabled>{t('admin.chooseStore')}</option>
            {filteredStores.map(s => (
              <option key={s.id} value={s.id}>
                {s.store_name || s.id.slice(0, 8)}{s.phone ? ` — ${s.phone}` : ''}
              </option>
            ))}
          </select>
          {filteredStores.length === 0 && (
            <p className="text-xs text-muted-foreground">{t('common.noData')}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('store.pickupLocation')}</label>
          <Input placeholder={t('store.pickupAddressPlaceholder')} value={pickupAddress} onChange={e => setPickupAddress(e.target.value)} required className="h-12 bg-card" />
          <Button type="button" variant="outline" onClick={openMapPicker} className="w-full h-10 text-sm">{t('common.chooseOnMap')}</Button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('store.deliveryLocation')}</label>
          <Input placeholder={t('store.deliveryAddressPlaceholder')} value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} required className="h-12 bg-card" />
          <Button type="button" variant="outline" onClick={openMapPicker} className="w-full h-10 text-sm">{t('common.chooseOnMap')}</Button>
        </div>

        <div className="p-4 rounded-2xl border border-primary bg-primary/10 text-center">
          <span className="text-2xl">🚗</span>
          <p className="font-medium text-sm mt-1">{t('common.standard')}</p>
          <p className="text-primary font-bold text-sm">{formatAmount(PRICES.standard)}</p>
        </div>

        <div className="space-y-3">
          <Textarea placeholder={t('store.description')} value={description} onChange={e => setDescription(e.target.value)} className="bg-card min-h-[80px]" />
          <Input type="tel" placeholder={t('store.clientPhone')} value={clientPhone} onChange={e => setClientPhone(e.target.value)} required className="h-12 bg-card" dir="ltr" />

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('store.pickupTime')}</label>
            <div className="flex gap-3">
              <button type="button" onClick={() => setPickupTime('immediate')}
                className={`flex-1 p-3 rounded-xl border text-sm ${pickupTime === 'immediate' ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}>
                {t('store.immediate')}
              </button>
              <button type="button" onClick={() => setPickupTime('scheduled')}
                className={`flex-1 p-3 rounded-xl border text-sm ${pickupTime === 'scheduled' ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}>
                {t('store.scheduled')}
              </button>
            </div>
            {pickupTime === 'scheduled' && (
              <Input type="datetime-local" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className="h-12 bg-card" dir="ltr" />
            )}
          </div>

          <Textarea placeholder={t('store.notes')} value={notes} onChange={e => setNotes(e.target.value)} className="bg-card" />
        </div>

        <Button type="submit" className="w-full h-12 rounded-xl" disabled={loading || !storeId}>
          {loading ? t('store.submitting') : t('store.confirmOrder')}
        </Button>
      </form>
    </div>
  );
};

const AdminDashboard = () => {
  const { t } = useTranslation();

  const ADMIN_NAV = [
    { icon: '📊', label: t('nav.home'), path: '/admin' },
    { icon: '📦', label: t('nav.orders'), path: '/admin/orders' },
    { icon: '➕', label: t('admin.createOrder'), path: '/admin/new-order' },
    { icon: '👥', label: t('nav.users'), path: '/admin/users' },
    { icon: '💳', label: t('nav.payments'), path: '/admin/payments' },
    { icon: '📈', label: t('nav.reports'), path: '/admin/reports' },
  ];

  return (
    <div className="app-container">
      <TopBar title={t('topBar.admin')} />
      <Routes>
        <Route index element={<AdminHome />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="new-order" element={<AdminCreateOrder />} />
        <Route path="create-order" element={<AdminCreateOrder />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="reports" element={<AdminReports />} />
      </Routes>
      <BottomNav items={ADMIN_NAV} />
    </div>
  );
};

export default AdminDashboard;
