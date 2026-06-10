
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  role TEXT CHECK (role IN ('store', 'driver', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Stores table
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  store_name TEXT,
  location_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store owners can manage own store" ON public.stores FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can read all stores" ON public.stores FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Drivers table
CREATE TABLE public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vehicle_type TEXT CHECK (vehicle_type IN ('pickup', 'sixwheel')) DEFAULT 'pickup',
  is_available BOOLEAN DEFAULT true,
  rating NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drivers can manage own record" ON public.drivers FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can read all drivers" ON public.drivers FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL,
  store_id UUID NOT NULL REFERENCES public.stores(id),
  driver_id UUID REFERENCES public.drivers(id),
  client_phone TEXT NOT NULL,
  pickup_address TEXT NOT NULL,
  pickup_lat NUMERIC,
  pickup_lng NUMERIC,
  delivery_address TEXT NOT NULL,
  delivery_lat NUMERIC,
  delivery_lng NUMERIC,
  description TEXT,
  notes TEXT,
  delivery_type TEXT NOT NULL CHECK (delivery_type IN ('pickup', 'sixwheel')),
  amount NUMERIC NOT NULL,
  pickup_time TEXT DEFAULT 'immediate',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','awaiting_driver','driver_assigned','arrived_pickup','loaded','in_transit','delivered','cancelled')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','submitted','confirmed','rejected')),
  receipt_url TEXT,
  photo_before_url TEXT,
  photo_after_url TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store owners can read own orders" ON public.orders FOR SELECT TO authenticated USING (
  store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid())
);
CREATE POLICY "Store owners can insert orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (
  store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid())
);
CREATE POLICY "Drivers can read assigned orders" ON public.orders FOR SELECT TO authenticated USING (
  driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
);
CREATE POLICY "Drivers can update assigned orders" ON public.orders FOR UPDATE TO authenticated USING (
  driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
);
CREATE POLICY "Admins can do everything with orders" ON public.orders FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  sender_role TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('text','image','voice')),
  message TEXT,
  media_url TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can read order messages" ON public.messages FOR SELECT TO authenticated USING (
  order_id IN (
    SELECT o.id FROM public.orders o
    LEFT JOIN public.stores s ON o.store_id = s.id
    LEFT JOIN public.drivers d ON o.driver_id = d.id
    WHERE s.user_id = auth.uid() OR d.user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
);
CREATE POLICY "Authenticated can insert messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());

-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Authenticated can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
