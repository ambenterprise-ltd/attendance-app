-- ==============================================================================
-- PHASE 7: ROW LEVEL SECURITY (RLS) HARDENING
-- Run this script in your Supabase SQL Editor.
-- ==============================================================================

-- 1. PREVENT NON-ADMINS FROM CHANGING THEIR ROLE IN PROFILES
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- If role is being changed and caller is not admin, reject
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Unauthorized: Only administrators can modify user roles';
  end if;
  return new;
end;
$$;

drop trigger if exists tr_protect_profile_role on public.profiles;
create trigger tr_protect_profile_role
  before update on public.profiles
  for each row execute procedure public.protect_profile_role();

-- 2. ENFORCE STATUS = 'pending' ON LEAVE INSERTS BY EMPLOYEES
drop policy if exists "leaves_insert_policy" on public.leaves;
create policy "leaves_insert_policy" on public.leaves
  for insert with check (
    (user_id = auth.uid() and status = 'pending')
    or public.is_admin()
  );

-- 3. ENFORCE STATUS = 'pending' ON EDIT REQUEST INSERTS BY EMPLOYEES
drop policy if exists "edit_requests_insert_policy" on public.edit_requests;
create policy "edit_requests_insert_policy" on public.edit_requests
  for insert with check (
    (user_id = auth.uid() and status = 'pending')
    or public.is_admin()
  );
