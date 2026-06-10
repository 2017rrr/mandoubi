
-- ============================================================
-- COMPREHENSIVE SECURITY POLICIES MIGRATION
-- Idempotent: safe to re-run. Uses DROP IF EXISTS + CREATE.
-- ============================================================

-- ==================== PROFILES ====================
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
CREATE POLICY "profiles_admin_select" ON public.profiles FOR SELECT TO authenticated USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id AND role IS NULL);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid()));

-- ==================== ORDERS ====================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_orders" ON public.orders;
CREATE POLICY "admin_all_orders" ON public.orders FOR ALL TO authenticated USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "store_read_orders" ON public.orders;
CREATE POLICY "store_read_orders" ON public.orders FOR SELECT TO authenticated
  USING (store_id IN (SELECT s.id FROM stores s WHERE s.user_id = auth.uid()));

DROP POLICY IF EXISTS "store_insert_orders" ON public.orders;
CREATE POLICY "store_insert_orders" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (store_id IN (SELECT s.id FROM stores s WHERE s.user_id = auth.uid()));

DROP POLICY IF EXISTS "drivers_can_read_available_orders" ON public.orders;
CREATE POLICY "drivers_can_read_available_orders" ON public.orders FOR SELECT TO authenticated
  USING (
    (driver_id IS NULL AND status = 'pending' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'driver'))
    OR (driver_id IN (SELECT d.id FROM drivers d WHERE d.user_id = auth.uid()))
  );

DROP POLICY IF EXISTS "driver_update_orders" ON public.orders;
CREATE POLICY "driver_update_orders" ON public.orders FOR UPDATE TO authenticated
  USING (driver_id IN (SELECT d.id FROM drivers d WHERE d.user_id = auth.uid()))
  WITH CHECK (driver_id IN (SELECT d.id FROM drivers d WHERE d.user_id = auth.uid()));

-- ==================== DRIVERS ====================
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drivers_manage_own" ON public.drivers;
CREATE POLICY "drivers_manage_own" ON public.drivers FOR ALL TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "store_owner_read_drivers" ON public.drivers;
CREATE POLICY "store_owner_read_drivers" ON public.drivers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.user_id = auth.uid()));

DROP POLICY IF EXISTS "drivers_admin_select" ON public.drivers;
CREATE POLICY "drivers_admin_select" ON public.drivers FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- ==================== STORES ====================
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stores_manage_own" ON public.stores;
CREATE POLICY "stores_manage_own" ON public.stores FOR ALL TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "driver_read_stores" ON public.stores;
CREATE POLICY "driver_read_stores" ON public.stores FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM drivers WHERE drivers.user_id = auth.uid()));

DROP POLICY IF EXISTS "stores_admin_select" ON public.stores;
CREATE POLICY "stores_admin_select" ON public.stores FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- ==================== NOTIFICATIONS ====================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_read_own" ON public.notifications;
CREATE POLICY "notifications_read_own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    (EXISTS (SELECT 1 FROM orders o JOIN stores s ON s.id = o.store_id WHERE o.id = notifications.order_id AND s.user_id = auth.uid()))
    OR (EXISTS (SELECT 1 FROM orders o JOIN drivers d ON d.id = o.driver_id WHERE o.id = notifications.order_id AND d.user_id = auth.uid()))
    OR is_admin(auth.uid())
  );

-- Drop any leftover permissive policies
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users or admins can insert notifications" ON public.notifications;

-- ==================== MESSAGES ====================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users only" ON public.messages;

DROP POLICY IF EXISTS "messages_read" ON public.messages;
CREATE POLICY "messages_read" ON public.messages FOR SELECT TO authenticated
  USING (
    (order_id IN (SELECT o.id FROM orders o LEFT JOIN stores s ON o.store_id = s.id LEFT JOIN drivers d ON o.driver_id = d.id WHERE s.user_id = auth.uid() OR d.user_id = auth.uid()))
    OR is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "messages_insert" ON public.messages;
CREATE POLICY "messages_insert" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND sender_role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid())
  );

DROP POLICY IF EXISTS "realtime_select_scoped" ON public.messages;
CREATE POLICY "realtime_select_scoped" ON public.messages FOR SELECT TO authenticated
  USING (
    (realtime.topic() = ('user-' || auth.uid()::text))
    OR (realtime.topic() ~~ 'order-%' AND EXISTS (
      SELECT 1 FROM orders o LEFT JOIN drivers d ON d.id = o.driver_id LEFT JOIN stores s ON s.id = o.store_id
      WHERE ('order-' || o.id::text) = realtime.topic() AND (d.user_id = auth.uid() OR s.user_id = auth.uid())
    ))
    OR is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "realtime_insert_scoped" ON public.messages;
CREATE POLICY "realtime_insert_scoped" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    (realtime.topic() = ('user-' || auth.uid()::text))
    OR (realtime.topic() ~~ 'order-%' AND EXISTS (
      SELECT 1 FROM orders o LEFT JOIN drivers d ON d.id = o.driver_id LEFT JOIN stores s ON s.id = o.store_id
      WHERE ('order-' || o.id::text) = realtime.topic() AND (d.user_id = auth.uid() OR s.user_id = auth.uid())
    ))
    OR is_admin(auth.uid())
  );

-- ==================== FUNCTIONS ====================
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (new.id) ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==================== STORAGE BUCKET POLICIES ====================
-- Ensure buckets exist (idempotent via ON CONFLICT)
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('delivery-photos', 'delivery-photos', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false) ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat-media
DROP POLICY IF EXISTS "Authenticated users can upload chat media" ON storage.objects;
CREATE POLICY "Authenticated users can upload chat media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-media');

DROP POLICY IF EXISTS "Authenticated users can read chat media" ON storage.objects;
CREATE POLICY "Authenticated users can read chat media" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'chat-media');

-- Storage policies for delivery-photos
DROP POLICY IF EXISTS "Drivers can upload delivery photos" ON storage.objects;
CREATE POLICY "Drivers can upload delivery photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'delivery-photos');

DROP POLICY IF EXISTS "Authenticated users can read delivery photos" ON storage.objects;
CREATE POLICY "Authenticated users can read delivery photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'delivery-photos');

-- Storage policies for receipts
DROP POLICY IF EXISTS "Store owners can upload receipts" ON storage.objects;
CREATE POLICY "Store owners can upload receipts" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'receipts');

DROP POLICY IF EXISTS "Authenticated users can read receipts" ON storage.objects;
CREATE POLICY "Authenticated users can read receipts" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'receipts');
