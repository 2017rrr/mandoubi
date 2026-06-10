

# Mishwark Project — Comprehensive Fix Plan

## Summary

After scanning the full Supabase database, RLS policies, and application code, I found **9 issues** — 4 critical security errors and 5 warnings, plus several functional bugs. Here is the plan to fix everything.

---

## Issues Found & Fixes

### 1. CRITICAL: Orders table RLS is disabled in production

The original migration created RLS policies, but the current DB shows **no RLS policies on orders**. They were likely dropped at some point.

**Fix:** Re-enable RLS and recreate all order policies using `is_admin()` to avoid recursion.

### 2. CRITICAL: Profiles INSERT policy allows privilege escalation

Current policy: `FOR INSERT TO public WITH CHECK (true)` — anyone can insert a profile with `role = 'admin'`.

**Fix:** Replace with a policy scoped to `authenticated` that forces `auth.uid() = id` and restricts role to `NULL` on insert (role is set later via ChooseRole page or admin).

### 3. CRITICAL: Notifications overly permissive SELECT

Two overlapping SELECT policies exist — `notifications_select` allows any authenticated user to read ALL notifications.

**Fix:** Drop the redundant `notifications_select` policy. Keep only `Users can read own notifications`.

### 4. CRITICAL: Notifications INSERT allows unauthenticated (`public` role)

`notifications_insert` policy is on `public` role, not `authenticated`.

**Fix:** Drop it. The existing `Users or admins can insert notifications` policy is sufficient.

### 5. WARN: `handle_new_user` trigger is missing + function conflicts with NOT NULL columns

The trigger was dropped. The function tries to insert only `id` and `role`, but `name` and `phone` were NOT NULL. Since columns are now nullable in the live DB, we should recreate the trigger as a safety net (using `ON CONFLICT DO NOTHING` since Register.tsx also inserts).

**Fix:** Recreate the trigger on `auth.users` after insert. Update function to set `search_path`.

### 6. WARN: `is_admin` and `handle_new_user` functions missing `search_path`

**Fix:** Recreate `handle_new_user` with `SET search_path = public`. `is_admin` already has it.

### 7. WARN: Stores/Drivers admin policies use subquery on profiles (potential recursion)

These use `EXISTS (SELECT 1 FROM profiles WHERE ...)` which could cause issues.

**Fix:** Replace with `public.is_admin(auth.uid())`.

### 8. WARN: Profiles has duplicate/conflicting SELECT policies

Both `Users can read own profile` (authenticated) and `Users can view own profile` (public) exist.

**Fix:** Drop the `public` role one. Also drop the `public` UPDATE policy and recreate as `authenticated`.

### 9. Code fix: Register.tsx inserts `role: null as any`

This bypasses TypeScript but could fail if the INSERT policy restricts role.

**Fix:** Remove `role` from the insert entirely (it defaults to NULL).

---

## Migration SQL (single migration)

The migration will:

1. **Orders** — Re-enable RLS, recreate 5 policies (store select, store insert, driver select, driver update, admin all) using `is_admin()`
2. **Profiles** — Drop bad INSERT/SELECT/UPDATE policies, recreate with proper `authenticated` role and `auth.uid() = id` checks; INSERT restricts role to NULL
3. **Notifications** — Drop `notifications_select` and `notifications_insert` (the redundant public ones)
4. **Stores/Drivers** — Replace admin policies to use `is_admin()`
5. **Trigger** — Recreate `handle_new_user` with `search_path` and reattach trigger

## Code Changes

- **Register.tsx** — Remove explicit `role: null as any` from the insert object
- No other code changes needed

---

## What You Need To Do Manually

1. **Enable Leaked Password Protection** — Go to Supabase Dashboard → Authentication → Settings → Enable "Leaked password protection"
2. **Realtime Authorization** — The broadcast/presence channel policies are on the `realtime.messages` table which cannot be modified via migrations. Go to Supabase Dashboard → Realtime → Authorization to scope channels.

