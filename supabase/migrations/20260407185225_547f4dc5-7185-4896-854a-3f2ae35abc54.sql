
-- 1. CRITICAL: Prevent role self-escalation in profiles_update_own
-- Add WITH CHECK that prevents changing the role column
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role IS NOT DISTINCT FROM (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  );

-- 2. Drop overly permissive storage INSERT policies that override scoped ones
DROP POLICY IF EXISTS "Drivers can upload delivery photos" ON storage.objects;
DROP POLICY IF EXISTS "Store owners can upload receipts" ON storage.objects;

-- 3. Drop overly permissive "Authenticated users can interact in channels" on public.messages
DROP POLICY IF EXISTS "Authenticated users can interact in channels" ON public.messages;

-- 4. Scope chat-media read to files belonging to orders the user participates in
DROP POLICY IF EXISTS "Chat media read scoped" ON storage.objects;
CREATE POLICY "Chat media read scoped" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND (
      EXISTS (
        SELECT 1 FROM orders o
        JOIN stores s ON s.id = o.store_id
        WHERE (storage.foldername(name))[1] = o.id::text
          AND s.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM orders o
        JOIN drivers d ON d.id = o.driver_id
        WHERE (storage.foldername(name))[1] = o.id::text
          AND d.user_id = auth.uid()
      )
      OR is_admin(auth.uid())
    )
  );
