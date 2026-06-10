
-- Fix 1: Restrict notifications INSERT to self-insert or admin
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;

CREATE POLICY "Users or admins can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() OR public.is_admin(auth.uid())
);

-- Fix 2: Allow store owners to read drivers assigned to their orders
CREATE POLICY "Store owners can read assigned drivers"
ON public.drivers
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT o.driver_id FROM orders o
    JOIN stores s ON o.store_id = s.id
    WHERE s.user_id = auth.uid() AND o.driver_id IS NOT NULL
  )
);
