-- Grant table-level permissions on orders to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;

-- Also ensure other tables have proper grants
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.drivers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.stores TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT ON public.messages TO authenticated;