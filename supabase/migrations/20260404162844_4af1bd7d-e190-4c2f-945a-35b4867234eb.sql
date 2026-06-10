
-- =============================================
-- 1. Create is_admin() helper function
-- =============================================
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = 'admin'
  );
$$;

-- =============================================
-- 2. Fix PROFILES policies (remove recursive admin select)
-- =============================================
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

-- Own profile select
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Admin can read all profiles (using is_admin to avoid recursion)
CREATE POLICY "profiles_admin_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Insert own profile, role must be null
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id AND role IS NULL);

-- Update own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- =============================================
-- 3. Fix ORDERS policies (public → authenticated, use is_admin)
-- =============================================
DROP POLICY IF EXISTS "admin_all_orders" ON public.orders;
DROP POLICY IF EXISTS "driver_read_orders" ON public.orders;
DROP POLICY IF EXISTS "driver_update_orders" ON public.orders;
DROP POLICY IF EXISTS "store_insert_orders" ON public.orders;
DROP POLICY IF EXISTS "store_read_orders" ON public.orders;

CREATE POLICY "orders_admin_all" ON public.orders
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "orders_store_select" ON public.orders
  FOR SELECT TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));

CREATE POLICY "orders_store_insert" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));

CREATE POLICY "orders_driver_select" ON public.orders
  FOR SELECT TO authenticated
  USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

CREATE POLICY "orders_driver_update" ON public.orders
  FOR UPDATE TO authenticated
  USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

-- =============================================
-- 4. Fix STORES admin policies (use is_admin, remove duplicates)
-- =============================================
DROP POLICY IF EXISTS "Admins can read all stores" ON public.stores;
DROP POLICY IF EXISTS "stores_admin_select" ON public.stores;

CREATE POLICY "stores_admin_select" ON public.stores
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- =============================================
-- 5. Fix DRIVERS admin policies (use is_admin, remove duplicates)
-- =============================================
DROP POLICY IF EXISTS "Admins can read all drivers" ON public.drivers;
DROP POLICY IF EXISTS "drivers_admin_select" ON public.drivers;

CREATE POLICY "drivers_admin_select" ON public.drivers
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- =============================================
-- 6. Fix NOTIFICATIONS (add INSERT for authenticated)
-- =============================================
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;

CREATE POLICY "notifications_insert_authenticated" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- =============================================
-- 7. Recreate handle_new_user trigger
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
