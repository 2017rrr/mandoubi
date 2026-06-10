-- Remove overly permissive "Authenticated users only" SELECT policy on messages
-- This policy uses USING(true) which lets ANY authenticated user read ALL messages,
-- bypassing the properly scoped messages_read policy
DROP POLICY IF EXISTS "Authenticated users only" ON public.messages;