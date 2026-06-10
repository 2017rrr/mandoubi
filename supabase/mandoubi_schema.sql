-- ============================================
-- قاعدة بيانات مندوبي — شغّل هذا في Supabase SQL Editor
-- ============================================

-- 1. الجداول الأساسية

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  name text,
  phone text,
  role text CHECK (role = ANY (ARRAY['store','driver','admin'])),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

CREATE TABLE public.stores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  store_name text,
  location_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stores_pkey PRIMARY KEY (id),
  CONSTRAINT stores_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.drivers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  vehicle_type text DEFAULT 'standard',
  is_available boolean DEFAULT true,
  rating numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT drivers_pkey PRIMARY KEY (id),
  CONSTRAINT drivers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_number bigint GENERATED ALWAYS AS IDENTITY,
  store_id uuid NOT NULL,
  driver_id uuid,
  pickup_address text,
  delivery_address text,
  pickup_lat double precision,
  pickup_lng double precision,
  delivery_lat double precision,
  delivery_lng double precision,
  delivery_type text DEFAULT 'standard',
  amount numeric NOT NULL DEFAULT 2.000,
  description text,
  notes text,
  client_phone text,
  pickup_time text DEFAULT 'immediate',
  status text DEFAULT 'pending',
  payment_status text DEFAULT 'pending',
  receipt_url text,
  photo_before_url text,
  photo_after_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id),
  CONSTRAINT orders_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id)
);

CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL,
  message text,
  message_type text DEFAULT 'text',
  media_url text,
  duration_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id uuid,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT notifications_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

-- جداول تلغرام
CREATE TABLE public.telegram_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  telegram_chat_id bigint NOT NULL UNIQUE,
  linked_at timestamptz DEFAULT now(),
  CONSTRAINT telegram_users_pkey PRIMARY KEY (id),
  CONSTRAINT telegram_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.telegram_link_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT telegram_link_codes_pkey PRIMARY KEY (id)
);

-- 2. الدوال الأساسية

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

CREATE OR REPLACE FUNCTION public.has_driver_profile(_user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM public.drivers WHERE user_id = _user_id);
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

CREATE OR REPLACE FUNCTION public.has_store_profile(_user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM public.stores WHERE user_id = _user_id);
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

CREATE OR REPLACE FUNCTION public.get_admin_ids()
RETURNS TABLE(id uuid) AS $$
  SELECT id FROM public.profiles WHERE role = 'admin';
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (new.id) ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- دالة قبول الطلب للمندوب (من التطبيق)
CREATE OR REPLACE FUNCTION public.driver_accept_order(order_id uuid)
RETURNS void AS $$
DECLARE
  v_driver_id uuid;
BEGIN
  SELECT id INTO v_driver_id FROM drivers WHERE user_id = auth.uid();
  IF v_driver_id IS NULL THEN RAISE EXCEPTION 'not a driver'; END IF;
  UPDATE orders SET driver_id = v_driver_id, status = 'driver_assigned', updated_at = now()
  WHERE id = order_id AND status = 'pending' AND driver_id IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'order not available or already claimed'; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- دالة قبول الطلب للبوت (بدون auth session)
CREATE OR REPLACE FUNCTION public.driver_accept_order_by_user(p_order_id uuid, p_driver_user_id uuid)
RETURNS void AS $$
DECLARE
  v_driver_id uuid;
BEGIN
  SELECT id INTO v_driver_id FROM drivers WHERE user_id = p_driver_user_id;
  IF v_driver_id IS NULL THEN RAISE EXCEPTION 'not a driver'; END IF;
  UPDATE orders SET driver_id = v_driver_id, status = 'driver_assigned', updated_at = now()
  WHERE id = p_order_id AND status = 'pending' AND driver_id IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'order not available or already claimed'; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- دالة تحديث الحالة للبوت
CREATE OR REPLACE FUNCTION public.update_order_status_by_driver(p_order_id uuid, p_driver_user_id uuid, p_new_status text)
RETURNS void AS $$
DECLARE
  v_driver_id uuid;
BEGIN
  SELECT id INTO v_driver_id FROM drivers WHERE user_id = p_driver_user_id;
  IF v_driver_id IS NULL THEN RAISE EXCEPTION 'not a driver'; END IF;
  UPDATE orders SET status = p_new_status, updated_at = now()
  WHERE id = p_order_id AND driver_id = v_driver_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'order not found or not assigned to this driver'; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- دالة إرسال رسالة من البوت
CREATE OR REPLACE FUNCTION public.send_chat_message_from_bot(p_order_id uuid, p_sender_user_id uuid, p_sender_role text, p_message text)
RETURNS void AS $$
BEGIN
  INSERT INTO messages(order_id, sender_id, sender_role, message, message_type)
  VALUES (p_order_id, p_sender_user_id, p_sender_role, p_message, 'text');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. View الطلبات المتاحة للمندوبين
CREATE OR REPLACE VIEW public.available_orders_for_drivers AS
SELECT o.*, s.store_name
FROM orders o
JOIN stores s ON s.id = o.store_id
WHERE o.status = 'pending' AND o.driver_id IS NULL;

-- 4. تفعيل RLS

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_link_codes ENABLE ROW LEVEL SECURITY;

-- 5. سياسات RLS

-- profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR is_admin(auth.uid()));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- stores
CREATE POLICY "stores_manage_own" ON public.stores FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "stores_admin_select" ON public.stores FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "driver_read_stores" ON public.stores FOR SELECT USING (has_driver_profile(auth.uid()));

-- drivers
CREATE POLICY "drivers_manage_own" ON public.drivers FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "store_owner_read_drivers" ON public.drivers FOR SELECT USING (has_store_profile(auth.uid()));
CREATE POLICY "drivers_admin_select" ON public.drivers FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- orders
CREATE POLICY "store_read_orders" ON public.orders FOR SELECT TO authenticated
  USING (store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid()));
CREATE POLICY "store_insert_orders" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid()));
CREATE POLICY "driver_read_orders" ON public.orders FOR SELECT TO authenticated
  USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
    OR (driver_id IS NULL AND status = 'pending' AND EXISTS (SELECT 1 FROM public.drivers WHERE user_id = auth.uid())));
CREATE POLICY "driver_update_orders" ON public.orders FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM drivers WHERE user_id = auth.uid())
    AND (driver_id IS NULL OR driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM drivers WHERE user_id = auth.uid()));
CREATE POLICY "admin_all_orders" ON public.orders FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- messages
CREATE POLICY "messages_read" ON public.messages FOR SELECT TO authenticated
  USING (order_id IN (
    SELECT o.id FROM orders o
    LEFT JOIN stores s ON o.store_id = s.id
    LEFT JOIN drivers d ON o.driver_id = d.id
    WHERE s.user_id = auth.uid() OR d.user_id = auth.uid()
  ) OR is_admin(auth.uid()));
CREATE POLICY "messages_insert" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND sender_role = (SELECT role FROM profiles WHERE id = auth.uid()));

-- notifications
CREATE POLICY "notifications_read_own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM orders o JOIN stores s ON s.id = o.store_id WHERE o.id = notifications.order_id AND s.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM orders o JOIN drivers d ON d.id = o.driver_id WHERE o.id = notifications.order_id AND d.user_id = auth.uid()));

-- telegram
CREATE POLICY "telegram_users_own" ON public.telegram_users FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "telegram_link_codes_own" ON public.telegram_link_codes FOR ALL TO authenticated USING (user_id = auth.uid());

-- 6. Storage Buckets (شغّل هذا أيضاً)
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('delivery-photos', 'delivery-photos', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', false) ON CONFLICT DO NOTHING;

-- سياسات Storage
CREATE POLICY "receipts_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'receipts');
CREATE POLICY "receipts_read_own" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'receipts');
CREATE POLICY "delivery_photos_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'delivery-photos');
CREATE POLICY "delivery_photos_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'delivery-photos');
CREATE POLICY "chat_media_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-media');
CREATE POLICY "chat_media_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'chat-media');

-- ============================================
-- انتهى! قاعدة بيانات مندوبي جاهزة ✅
-- ============================================
