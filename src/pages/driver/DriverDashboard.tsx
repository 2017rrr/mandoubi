import { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { OrderCard } from "@/components/OrderCard";
import { Button } from "@/components/ui/button";
import { formatAmount, openNavigation, STATUS_LABELS, getDriverEarning, type OrderStatus } from "@/utils/constants";
import { useToast } from "@/hooks/use-toast";

import { useTranslation } from "react-i18next";

const DriverActive = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<any>(null);

  const fetchOrders = async () => {
    if (!user) return;
    const { data: driver } = await supabase.from("drivers").select("id").eq("user_id", user.id).single();
    if (!driver) return;
    setDriverId(driver.id);
    const [availableRes, myRes] = await Promise.all([
      supabase.from("available_orders_for_drivers").select("*").order("created_at", { ascending: false }),
      supabase.from("orders").select("id, order_number, amount, pickup_address, delivery_address, pickup_lat, pickup_lng, delivery_lat, delivery_lng, delivery_type, status, created_at, client_phone, description, notes, photo_before_url, photo_after_url, store_id")
        .eq("driver_id", driver.id).not("status", "in", '("delivered","cancelled")').order("created_at", { ascending: false }),
    ]);
    setAvailableOrders(availableRes.data || []);
    setMyOrders(myRes.data || []);
  };

  useEffect(() => {
    fetchOrders();
    const channel = supabase.channel("driver-orders").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchOrders()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const acceptOrder = async (orderId: string) => {
    if (!driverId) return;
    const { data: orderData } = await supabase.from("orders").select("order_number, store_id").eq("id", orderId).single();
    const { error } = await supabase.rpc("driver_accept_order", { order_id: orderId });
    if (error) {
      if (error.message.includes("not a driver")) toast({ title: t('common.error'), description: t('driver.notAuthorized'), variant: "destructive" });
      else if (error.message.includes("not available")) toast({ title: t('common.error'), description: t('driver.orderNotAvailable'), variant: "destructive" });
      else if (error.message.includes("already claimed")) toast({ title: t('common.error'), description: t('driver.orderAlreadyClaimed'), variant: "destructive" });
      else toast({ title: t('common.error'), description: error.message, variant: "destructive" });
      return;
    }
    if (orderData) {
      const { data: store } = await supabase.from("stores").select("user_id").eq("id", orderData.store_id).single();
      if (store) {
        await supabase.from("notifications").insert({ user_id: store.user_id, order_id: orderId, type: "order_accepted", title: "تم قبول الطلب", body: `سائق قبل الطلب #${orderData.order_number}` });
      }
    }
    toast({ title: t('driver.orderAccepted') });
    fetchOrders();
  };

  const updateStatus = async (order: any, newStatus: string) => {
    const { error: updateError } = await supabase.from("orders").update({ status: newStatus }).eq("id", order.id);
    if (updateError) {
      toast({ title: t('common.error'), description: updateError.message, variant: "destructive" });
      return;
    }
    const { data: store } = await supabase.from("stores").select("user_id").eq("id", order.store_id).single();
    if (store) {
      await supabase.from("notifications").insert({ user_id: store.user_id, order_id: order.id, type: "status_update", title: "تحديث حالة الطلب", body: `الطلب #${order.order_number}: ${t(`status.${newStatus}`)}` });
    }
    toast({ title: t('driver.statusUpdated') });
    fetchOrders();
  };

  const handlePhotoUpload = async (order: any, field: "photo_before_url" | "photo_after_url", file: File) => {
    const path = `${order.id}/${field}_${Date.now()}.jpg`;
    const { data } = await supabase.storage.from("delivery-photos").upload(path, file);
    if (data) {
      // حفظ في الطلب
      await supabase.from("orders").update({ [field]: data.path } as any).eq("id", order.id);

      // إرسال الصورة كرسالة في المحادثة
      const label = field === "photo_before_url" ? "📦 صورة قبل التحميل" : "✅ صورة بعد التسليم";
      await supabase.from("messages").insert({
        order_id: order.id,
        sender_id: user!.id,
        sender_role: "driver",
        message_type: "image",
        media_url: `delivery-photos/${data.path}`,
        message: label,
      });

      // إشعار صاحب المحل
      const { data: store } = await supabase.from("stores").select("user_id").eq("id", order.store_id).single();
      if (store) {
        await supabase.from("notifications").insert({
          user_id: store.user_id,
          order_id: order.id,
          type: "new_message",
          title: label,
          body: `السائق أرسل ${label} للطلب #${order.order_number}`,
        });
      }

      // إشعار الأدمن
      const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin");
      if (admins) {
        for (const admin of admins) {
          await supabase.from("notifications").insert({
            user_id: admin.id,
            order_id: order.id,
            type: "new_message",
            title: label,
            body: `السائق أرسل ${label} للطلب #${order.order_number}`,
          });
        }
      }

      toast({ title: t('driver.photoUploaded') });
      fetchOrders();
    }
  };

  return (
    <div className="page-content space-y-6">
      <div className="space-y-3">
        <h2 className="font-bold text-lg">{t('driver.availableOrders')}</h2>
        {availableOrders.length === 0 ? (
          <p className="text-center text-muted-foreground py-4 text-sm">{t('driver.noAvailable')}</p>
        ) : (
          availableOrders.map((o) => (
            <div key={o.id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold">🧾 #{o.order_number}</span>
                <span className="text-sm font-bold text-primary">{formatAmount(o.driver_amount ?? getDriverEarning(o.amount))}</span>
              </div>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">📍 {t('common.from')}</span> {o.pickup_address}</p>
                <p><span className="text-muted-foreground">📍 {t('common.to')}</span> {o.delivery_address}</p>
                <p>🚚 {t('common.standard')}</p>
              </div>
              <Button className="w-full h-10 rounded-xl" onClick={() => acceptOrder(o.id)}>{t('driver.acceptOrder')}</Button>
            </div>
          ))
        )}
      </div>

      <div className="space-y-3">
        <h2 className="font-bold text-lg">{t('driver.myActiveOrders')}</h2>
        {myOrders.length === 0 ? (
          <p className="text-center text-muted-foreground py-4 text-sm">{t('driver.noActiveOrders')}</p>
        ) : (
          myOrders.map((order) => {
            const statusInfo = STATUS_LABELS[order.status as OrderStatus];
            return (
              <div key={order.id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold">🧾 #{order.order_number}</span>
                  <span className={`status-badge ${statusInfo?.color}`}>{t(`status.${order.status}`)}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('driver.pickupLabel')}</span>
                    <p>{order.pickup_address}</p>
                    {order.pickup_lat && <Button variant="outline" size="sm" onClick={() => openNavigation(order.pickup_lat, order.pickup_lng)} className="mt-1 text-xs">{t('common.openGoogleMaps')}</Button>}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('driver.deliveryLabel')}</span>
                    <p>{order.delivery_address}</p>
                    {order.delivery_lat && <Button variant="outline" size="sm" onClick={() => openNavigation(order.delivery_lat, order.delivery_lng)} className="mt-1 text-xs">{t('common.openGoogleMaps')}</Button>}
                  </div>
                  <p>{t('driver.deliveryTypeLabel')} {t('common.standard')}</p>
                  <p>{t('driver.amountLabel')} {formatAmount(order.driver_amount ?? getDriverEarning(order.amount))}</p>
                  <a href={`tel:${order.client_phone}`} className="text-primary underline block">📞 {order.client_phone}</a>
                  {order.description && <p>📝 {order.description}</p>}
                  {order.notes && <p>📋 {order.notes}</p>}
                </div>
                <Button variant="outline" className="w-full" onClick={() => navigate(`/order/${order.id}`)}>{t('driver.openChat')}</Button>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">{t('driver.photoBefore')}</label>
                    <input type="file" accept="image/*" capture="environment" onChange={(e) => e.target.files?.[0] && handlePhotoUpload(order, "photo_before_url", e.target.files[0])} className="w-full text-xs file:bg-card file:border file:border-border file:rounded-lg file:px-3 file:py-2" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">{t('driver.photoAfter')}</label>
                    <input type="file" accept="image/*" capture="environment" onChange={(e) => e.target.files?.[0] && handlePhotoUpload(order, "photo_after_url", e.target.files[0])} className="w-full text-xs file:bg-card file:border file:border-border file:rounded-lg file:px-3 file:py-2" />
                  </div>
                </div>
                <div className="space-y-2">
                  {order.status === "driver_assigned" && <Button className="w-full h-12 rounded-xl" onClick={() => updateStatus(order, "arrived_pickup")}>{t('driver.arrived')}</Button>}
                  {order.status === "arrived_pickup" && <Button className="w-full h-12 rounded-xl" onClick={() => updateStatus(order, "loaded")}>{t('driver.loaded')}</Button>}
                  {order.status === "loaded" && <Button className="w-full h-12 rounded-xl" onClick={() => updateStatus(order, "in_transit")}>{t('driver.inTransit')}</Button>}
                  {order.status === "in_transit" && <Button className="w-full h-12 rounded-xl bg-success hover:bg-success/90" onClick={() => updateStatus(order, "delivered")}>{t('driver.delivered')}</Button>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const DriverHistory = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: driver } = await supabase.from("drivers").select("id").eq("user_id", user.id).single();
      if (!driver) return;
      const { data } = await supabase.from("orders").select("*").eq("driver_id", driver.id).eq("status", "delivered").order("created_at", { ascending: false });
      if (data) setOrders(data);
    };
    fetch();
  }, [user]);

  return (
    <div className="page-content space-y-3">
      <h2 className="font-bold">{t('driver.orderHistory')}</h2>
      {orders.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">{t('driver.noCompletedOrders')}</p>
      ) : (
        orders.map((o) => <OrderCard key={o.id} order={o} showDriverAmount={true} />)
      )}
    </div>
  );
};

const DriverEarnings = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: driver } = await supabase.from("drivers").select("id").eq("user_id", user.id).single();
      if (!driver) return;
      const { data } = await supabase.from("orders").select("*").eq("driver_id", driver.id).eq("status", "delivered").order("created_at", { ascending: false });
      if (data) setOrders(data);
    };
    fetch();
  }, [user]);

  const today = new Date().toDateString();
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const todayEarnings = orders.filter((o) => new Date(o.created_at).toDateString() === today).reduce((s, o) => s + Number(o.driver_amount ?? getDriverEarning(o.amount)), 0);
  const weekEarnings = orders.filter((o) => new Date(o.created_at) >= weekAgo).reduce((s, o) => s + Number(o.driver_amount ?? getDriverEarning(o.amount)), 0);
  const totalEarnings = orders.reduce((s, o) => s + Number(o.driver_amount ?? getDriverEarning(o.amount)), 0);

  return (
    <div className="page-content space-y-4">
      <h2 className="font-bold">{t('driver.myEarnings')}</h2>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t('driver.today'), value: todayEarnings },
          { label: t('driver.thisWeek'), value: weekEarnings },
          { label: t('driver.total'), value: totalEarnings },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-2xl border border-border p-3 text-center">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="font-bold text-primary mt-1">{formatAmount(s.value)}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {orders.map((o) => (
          <div key={o.id} className="bg-card rounded-2xl border border-border p-3 flex items-center justify-between">
            <span className="text-sm">#{o.order_number}</span>
            <span className="text-sm font-bold text-primary">{formatAmount(o.driver_amount ?? getDriverEarning(o.amount))}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const DriverProfile = () => {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [vehicleType] = useState("standard");

  useEffect(() => {
    if (!user) return;
    supabase.from("drivers").select("vehicle_type").eq("user_id", user.id).single().then(({ data }) => {
      if (data) { /* vehicle_type is always standard */ }
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    await supabase.from("drivers").update({ vehicle_type: vehicleType }).eq("user_id", user.id);
    toast({ title: t('common.done') });
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
        <label className="text-sm font-medium">{t('driver.vehicleType')}</label>
        <div className="w-full h-12 rounded-xl bg-card border border-border px-4 flex items-center text-foreground">
          {t('common.standard')}
        </div>
        <Button onClick={handleSave} className="w-full h-12 rounded-xl">{t('common.save')}</Button>
      </div>

      <a href="https://t.me/Mandoubi_bot" target="_blank" rel="noopener noreferrer">
        <Button variant="outline" className="w-full h-12 rounded-xl gap-2">
          <span>✈️</span> تواصل معنا عبر تلغرام
        </Button>
      </a>

      <Button variant="outline" onClick={signOut} className="w-full h-12 rounded-xl text-destructive">{t('common.logout')}</Button>
    </div>
  );
};

const DriverDashboard = () => {
  const { t } = useTranslation();

  const DRIVER_NAV = [
    { icon: "🗺", label: t('nav.active'), path: "/driver" },
    { icon: "📋", label: t('nav.history'), path: "/driver/history" },
    { icon: "💰", label: t('nav.earnings'), path: "/driver/earnings" },
    { icon: "👤", label: t('nav.myAccount'), path: "/driver/profile" },
  ];

  return (
    <div className="app-container">
      <TopBar title={t('topBar.driver')} />
      <Routes>
        <Route index element={<DriverActive />} />
        <Route path="history" element={<DriverHistory />} />
        <Route path="earnings" element={<DriverEarnings />} />
        <Route path="profile" element={<DriverProfile />} />
      </Routes>
      <BottomNav items={DRIVER_NAV} />
    </div>
  );
};

export default DriverDashboard;
