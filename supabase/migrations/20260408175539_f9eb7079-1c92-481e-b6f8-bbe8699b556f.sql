create or replace function public.has_store_profile(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.stores
    where user_id = _user_id
  );
$$;

create or replace function public.has_driver_profile(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.drivers
    where user_id = _user_id
  );
$$;

drop policy if exists driver_read_stores on public.stores;
create policy driver_read_stores
on public.stores
for select
to authenticated
using (public.has_driver_profile(auth.uid()));

drop policy if exists store_owner_read_drivers on public.drivers;
create policy store_owner_read_drivers
on public.drivers
for select
to authenticated
using (public.has_store_profile(auth.uid()));