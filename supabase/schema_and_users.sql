-- ==============================================================================
-- TEAM ATTENDANCE & TASK TRACKING: COMPLETE DATABASE INITIALIZATION
-- Run this entire script in your Supabase SQL Editor.
-- It creates:
--   1. Extensions (pgcrypto)
--   2. Tables (profiles, attendance, tasks) with proper constraints & RLS
--   3. Helper function is_admin()
--   4. RLS Policies
--   5. Required RPC Functions (check_in, check_out, start_task, end_task)
--   6. Auto-profile trigger for auth.users
--   7. Seeds 1 Admin and 1 Employee user with passwords
-- ==============================================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------------------------
-- 1. TABLES
-- ------------------------------------------------------------------------------

-- Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'employee')),
  created_at timestamptz not null default now()
);

-- Attendance table
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  work_date date not null default (now() at time zone 'Asia/Karachi')::date,
  check_in timestamptz not null default now(),
  check_out timestamptz,
  status text not null check (status in ('present', 'late', 'absent', 'leave', 'half_day')),
  auto_closed boolean not null default false,
  constraint attendance_user_date_unique unique (user_id, work_date)
);

-- Tasks table
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null check (category in ('Client Work', 'Internal', 'Meeting', 'Learning', 'Other')),
  objective text not null,
  start_time timestamptz not null default now(),
  end_time timestamptz,
  outcome text,
  status text not null check (status in ('in_progress', 'done', 'blocked', 'carried_over'))
);

-- Ensure only one task can be in_progress per user
create unique index if not exists idx_tasks_one_in_progress 
  on public.tasks (user_id) 
  where (status = 'in_progress');

-- Indexes for fast querying
create index if not exists idx_attendance_user_date on public.attendance (user_id, work_date);
create index if not exists idx_tasks_user_status on public.tasks (user_id, status);

-- ------------------------------------------------------------------------------
-- 2. HELPER FUNCTION: is_admin()
-- ------------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ------------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.attendance enable row level security;
alter table public.tasks enable row level security;

-- Profiles policies
drop policy if exists "profiles_select_policy" on public.profiles;
create policy "profiles_select_policy" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles
  for update using (public.is_admin() or id = auth.uid());

drop policy if exists "profiles_admin_insert" on public.profiles;
create policy "profiles_admin_insert" on public.profiles
  for insert with check (public.is_admin() or id = auth.uid());

-- Attendance policies
drop policy if exists "attendance_select_policy" on public.attendance;
create policy "attendance_select_policy" on public.attendance
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "attendance_admin_all" on public.attendance;
create policy "attendance_admin_all" on public.attendance
  for all using (public.is_admin());

-- Tasks policies
drop policy if exists "tasks_select_policy" on public.tasks;
create policy "tasks_select_policy" on public.tasks
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "tasks_admin_all" on public.tasks;
create policy "tasks_admin_all" on public.tasks
  for all using (public.is_admin());

-- ------------------------------------------------------------------------------
-- 4. RPC FUNCTIONS
-- ------------------------------------------------------------------------------

-- check_in()
create or replace function public.check_in()
returns public.attendance
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_time time := (now() at time zone 'Asia/Karachi')::time;
  v_status text;
  v_record public.attendance;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if exists (select 1 from public.attendance where user_id = v_user_id and work_date = v_today) then
    raise exception 'Already checked in today';
  end if;

  -- Late rule: check-in after 09:15 Karachi time = 'late'
  if v_time > '09:15:00'::time then
    v_status := 'late';
  else
    v_status := 'present';
  end if;

  insert into public.attendance (user_id, work_date, check_in, status, auto_closed)
  values (v_user_id, v_today, now(), v_status, false)
  returning * into v_record;

  return v_record;
end;
$$;

-- check_out()
create or replace function public.check_out()
returns public.attendance
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_record public.attendance;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- fails if the user has a running task
  if exists (select 1 from public.tasks where user_id = v_user_id and status = 'in_progress') then
    raise exception 'Cannot check out while a task is in progress. Please end your active task first.';
  end if;

  select * into v_record from public.attendance where user_id = v_user_id and work_date = v_today;
  if not found then
    raise exception 'No check-in record found for today';
  end if;

  if v_record.check_out is not null then
    raise exception 'Already checked out today';
  end if;

  update public.attendance
  set check_out = now()
  where id = v_record.id
  returning * into v_record;

  return v_record;
end;
$$;

-- start_task(p_title, p_category, p_objective)
create or replace function public.start_task(
  p_title text,
  p_category text,
  p_objective text
)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_att public.attendance;
  v_task public.tasks;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- requires being checked in today and not yet checked out
  select * into v_att from public.attendance where user_id = v_user_id and work_date = v_today;
  if not found then
    raise exception 'You must check in before starting a task';
  end if;

  if v_att.check_out is not null then
    raise exception 'Cannot start a task after checking out for the day';
  end if;

  if exists (select 1 from public.tasks where user_id = v_user_id and status = 'in_progress') then
    raise exception 'You already have an active task in progress. Complete or end it before starting a new one.';
  end if;

  if p_category not in ('Client Work', 'Internal', 'Meeting', 'Learning', 'Other') then
    raise exception 'Invalid category. Allowed: Client Work, Internal, Meeting, Learning, Other';
  end if;

  insert into public.tasks (user_id, title, category, objective, start_time, status)
  values (v_user_id, p_title, p_category, p_objective, now(), 'in_progress')
  returning * into v_task;

  return v_task;
end;
$$;

-- end_task(p_task_id, p_outcome, p_status)
create or replace function public.end_task(
  p_task_id uuid,
  p_outcome text,
  p_status text
)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_task public.tasks;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_status not in ('done', 'blocked', 'carried_over') then
    raise exception 'Invalid status. Allowed: done, blocked, carried_over';
  end if;

  select * into v_task from public.tasks where id = p_task_id and user_id = v_user_id and status = 'in_progress';
  if not found then
    raise exception 'Task not found or is not currently in progress';
  end if;

  update public.tasks
  set end_time = now(),
      outcome = p_outcome,
      status = p_status
  where id = p_task_id
  returning * into v_task;

  return v_task;
end;
$$;

-- Grant permissions to authenticated users for RPC
grant execute on function public.check_in() to authenticated;
grant execute on function public.check_out() to authenticated;
grant execute on function public.start_task(text, text, text) to authenticated;
grant execute on function public.end_task(uuid, text, text) to authenticated;

-- ------------------------------------------------------------------------------
-- 5. TRIGGER: Automatically create profile when a user is created in auth.users
-- ------------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'employee')
  )
  on conflict (id) do update
  set full_name = excluded.full_name,
      role = excluded.role;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 6. SEED USERS: 1 Admin and 1 Employee
-- ------------------------------------------------------------------------------
do $$
declare
  v_admin_id uuid := gen_random_uuid();
  v_admin_email text := 'admin@company.com';
  v_admin_password text := 'Admin1234!';

  v_emp_id uuid := gen_random_uuid();
  v_emp_email text := 'employee@company.com';
  v_emp_password text := 'Employee1234!';
begin

  -- 1. Admin
  if not exists (select 1 from auth.users where email = v_admin_email) then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_admin_id, 'authenticated', 'authenticated',
      v_admin_email, crypt(v_admin_password, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{"full_name":"Admin User","role":"admin"}',
      now(), now(), '', '', '', ''
    );

    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (v_admin_id, v_admin_id, format('{"sub":"%s","email":"%s"}', v_admin_id::text, v_admin_email)::jsonb, 'email', v_admin_id::text, now(), now(), now());

    insert into public.profiles (id, full_name, role)
    values (v_admin_id, 'Admin User', 'admin')
    on conflict (id) do update set full_name = 'Admin User', role = 'admin';
  else
    select id into v_admin_id from auth.users where email = v_admin_email;
    insert into public.profiles (id, full_name, role)
    values (v_admin_id, 'Admin User', 'admin')
    on conflict (id) do update set full_name = 'Admin User', role = 'admin';
  end if;

  -- 2. Employee
  if not exists (select 1 from auth.users where email = v_emp_email) then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_emp_id, 'authenticated', 'authenticated',
      v_emp_email, crypt(v_emp_password, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{"full_name":"Employee User","role":"employee"}',
      now(), now(), '', '', '', ''
    );

    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (v_emp_id, v_emp_id, format('{"sub":"%s","email":"%s"}', v_emp_id::text, v_emp_email)::jsonb, 'email', v_emp_id::text, now(), now(), now());

    insert into public.profiles (id, full_name, role)
    values (v_emp_id, 'Employee User', 'employee')
    on conflict (id) do update set full_name = 'Employee User', role = 'employee';
  else
    select id into v_emp_id from auth.users where email = v_emp_email;
    insert into public.profiles (id, full_name, role)
    values (v_emp_id, 'Employee User', 'employee')
    on conflict (id) do update set full_name = 'Employee User', role = 'employee';
  end if;

end $$;
