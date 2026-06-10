
-- 1. Make all storage buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('chat-media', 'delivery-photos', 'receipts');

-- 2. Remove public (anonymous) read policies
DROP POLICY IF EXISTS "Anyone can read chat media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read delivery photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read receipts" ON storage.objects;

-- 3. Add a trigger to enforce sender_role from the user's profile
CREATE OR REPLACE FUNCTION public.set_message_sender_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actual_role text;
BEGIN
  SELECT role INTO actual_role FROM public.profiles WHERE id = NEW.sender_id;
  IF actual_role IS NULL THEN
    actual_role := 'store';
  END IF;
  NEW.sender_role := actual_role;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_message_sender_role ON public.messages;
CREATE TRIGGER trg_set_message_sender_role
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_message_sender_role();
