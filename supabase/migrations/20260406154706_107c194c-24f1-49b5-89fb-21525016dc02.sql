-- 1. PROFILES: Enable RLS + clean up policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "trigger_insert_own_profile" ON public.profiles FOR INSERT TO public WITH CHECK (auth.uid() = id);

-- 2. STORAGE: Tighten chat-media SELECT
DROP POLICY IF EXISTS "Authenticated users can read chat media" ON storage.objects;
CREATE POLICY "Chat media read scoped" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-media' AND (
    EXISTS (SELECT 1 FROM orders o JOIN stores s ON s.id = o.store_id WHERE s.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM orders o JOIN drivers d ON d.id = o.driver_id WHERE d.user_id = auth.uid())
    OR is_admin(auth.uid())
  ));

-- 3. STORAGE: Tighten upload policies
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload chat media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload delivery photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;

CREATE POLICY "Chat media upload scoped" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-media' AND (
    EXISTS (SELECT 1 FROM stores WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM drivers WHERE user_id = auth.uid())
    OR is_admin(auth.uid())
  ));

CREATE POLICY "Delivery photos upload scoped" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'delivery-photos' AND (
    EXISTS (SELECT 1 FROM drivers WHERE user_id = auth.uid())
    OR is_admin(auth.uid())
  ));

CREATE POLICY "Receipts upload scoped" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipts' AND (
    EXISTS (SELECT 1 FROM stores WHERE user_id = auth.uid())
    OR is_admin(auth.uid())
  ));

-- 4. Tighten delivery-photos and receipts SELECT
DROP POLICY IF EXISTS "Authenticated users can read delivery photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read receipts" ON storage.objects;
DROP POLICY IF EXISTS "receipts_read" ON storage.objects;

CREATE POLICY "Delivery photos read scoped" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'delivery-photos' AND (
    EXISTS (SELECT 1 FROM orders o JOIN stores s ON s.id = o.store_id WHERE s.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM orders o JOIN drivers d ON d.id = o.driver_id WHERE d.user_id = auth.uid())
    OR is_admin(auth.uid())
  ));

CREATE POLICY "Receipts read scoped" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'receipts' AND (
    EXISTS (SELECT 1 FROM orders o JOIN stores s ON s.id = o.store_id WHERE s.user_id = auth.uid())
    OR is_admin(auth.uid())
  ));

-- 5. Deduplicate messages realtime policies
DROP POLICY IF EXISTS "realtime_select_scoped" ON public.messages;
DROP POLICY IF EXISTS "realtime_insert_scoped" ON public.messages;

CREATE POLICY "realtime_select_scoped" ON public.messages FOR SELECT TO authenticated
  USING ((realtime.topic() = ('user-' || auth.uid()::text))
    OR (realtime.topic() ~~ 'order-%' AND EXISTS (
      SELECT 1 FROM orders o LEFT JOIN drivers d ON d.id = o.driver_id LEFT JOIN stores s ON s.id = o.store_id
      WHERE ('order-' || o.id::text) = realtime.topic() AND (d.user_id = auth.uid() OR s.user_id = auth.uid())
    )) OR is_admin(auth.uid()));

CREATE POLICY "realtime_insert_scoped" ON public.messages FOR INSERT TO authenticated
  WITH CHECK ((realtime.topic() = ('user-' || auth.uid()::text))
    OR (realtime.topic() ~~ 'order-%' AND EXISTS (
      SELECT 1 FROM orders o LEFT JOIN drivers d ON d.id = o.driver_id LEFT JOIN stores s ON s.id = o.store_id
      WHERE ('order-' || o.id::text) = realtime.topic() AND (d.user_id = auth.uid() OR s.user_id = auth.uid())
    )) OR is_admin(auth.uid()));