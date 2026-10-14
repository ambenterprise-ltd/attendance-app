-- ==============================================================================
-- PHASE 6: ADMIN CONTROL TABLES & RPC FUNCTIONS
-- Run this script in your Supabase project's SQL Editor.
-- Sets up:
--   1. Leaves table & RLS
--   2. Edit Requests (timestamp corrections) table & RLS
--   3. Audit Log table & RLS
--   4. RPC functions:
--      - review_leave_request()
--      - approve_edit_request()
--      - reject_edit_request()
--      - admin_assign_task()
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. LEAVES TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.leaves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  leave_type text not null check (leave_type in ('sick', 'casual', 'annual', 'unpaid')),
  reason text not null,
  status text not null check (status in ('pending', 'approved', 'rejected')) default 'pending',
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now()
);

alter table public.leaves enable row level security;

drop policy if exists "leaves_select_policy" on public.leaves;
create policy "leaves_select_policy" on public.leaves
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "leaves_insert_policy" on public.leaves;
create policy "leaves_insert_policy" on public.leaves
  for insert with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "leaves_admin_update" on public.leaves;
create policy "leaves_admin_update" on public.leaves
  for update using (public.is_admin());

-- ------------------------------------------------------------------------------
-- 2. EDIT REQUESTS TABLE (Timestamp Corrections)
-- ------------------------------------------------------------------------------
create table if not exists public.edit_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  attendance_id uuid references public.attendance(id) on delete set null,
  work_date date not null,
  requested_check_in timestamptz,
  requested_check_out timestamptz,
  reason text not null,
  status text not null check (status in ('pending', 'approved', 'rejected')) default 'pending',
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now()
);

alter table public.edit_requests enable row level security;

drop policy if exists "edit_requests_select_policy" on public.edit_requests;
create policy "edit_requests_select_policy" on public.edit_requests
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "edit_requests_insert_policy" on public.edit_requests;
create policy "edit_requests_insert_policy" on public.edit_requests
  for insert with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "edit_requests_admin_update" on public.edit_requests;
create policy "edit_requests_admin_update" on public.edit_requests
  for update using (public.is_admin());

-- ------------------------------------------------------------------------------
-- 3. AUDIT LOG TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id),
  action text not null,
  target_user_id uuid references auth.users(id),
  entity_type text not null,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

drop policy if exists "audit_log_select_policy" on public.audit_log;
create policy "audit_log_select_policy" on public.audit_log
  for select using (public.is_admin());

drop policy if exists "audit_log_insert_policy" on public.audit_log;
create policy "audit_log_insert_policy" on public.audit_log
  for insert with check (public.is_admin() or auth.uid() is not null);

-- ------------------------------------------------------------------------------
-- 4. RPC FUNCTIONS
-- ------------------------------------------------------------------------------

-- Review Leave Request (Approve or Reject)
create or replace function public.review_leave_request(
  p_leave_id uuid,
  p_status text,
  p_notes text default null
)
returns public.leaves
language plpgsql
security definer
set search_path = public
as $$
declare
  v_leave public.leaves;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: Admin privileges required';
  end if;

  if p_status not in ('approved', 'rejected') then
    raise exception 'Invalid status. Must be approved or rejected';
  end if;

  select * into v_leave from public.leaves where id = p_leave_id;
  if not found then
    raise exception 'Leave request not found';
  end if;

  update public.leaves
  set status = p_status,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      admin_notes = p_notes
  where id = p_leave_id
  returning * into v_leave;

  -- Write to audit log
  insert into public.audit_log (actor_id, action, target_user_id, entity_type, entity_id, new_values, notes)
  values (
    auth.uid(),
    'REVIEW_LEAVE_' || upper(p_status),
    v_leave.user_id,
    'leaves',
    p_leave_id,
    jsonb_build_object('status', p_status, 'notes', p_notes),
    p_notes
  );

  return v_leave;
end;
$$;

-- Approve Timestamp Correction Request
create or replace function public.approve_edit_request(
  p_request_id uuid,
  p_notes text default null
)
returns public.edit_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.edit_requests;
  v_att public.attendance;
  v_old_att jsonb;
  v_new_att jsonb;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: Admin privileges required';
  end if;

  select * into v_req from public.edit_requests where id = p_request_id;
  if not found then
    raise exception 'Edit request not found';
  end if;

  if v_req.status != 'pending' then
    raise exception 'Request has already been processed';
  end if;

  -- Find or create the attendance record
  if v_req.attendance_id is not null then
    select * into v_att from public.attendance where id = v_req.attendance_id;
  else
    select * into v_att from public.attendance where user_id = v_req.user_id and work_date = v_req.work_date;
  end if;

  if v_att.id is not null then
    v_old_att := to_jsonb(v_att);

    update public.attendance
    set check_in = coalesce(v_req.requested_check_in, check_in),
        check_out = coalesce(v_req.requested_check_out, check_out)
    where id = v_att.id
    returning * into v_att;

    v_new_att := to_jsonb(v_att);
  else
    v_old_att := null;

    insert into public.attendance (user_id, work_date, check_in, check_out, status, auto_closed)
    values (
      v_req.user_id,
      v_req.work_date,
      coalesce(v_req.requested_check_in, now()),
      v_req.requested_check_out,
      'present',
      false
    )
    returning * into v_att;

    v_new_att := to_jsonb(v_att);
  end if;

  -- Mark edit request as approved
  update public.edit_requests
  set status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      admin_notes = p_notes
  where id = p_request_id
  returning * into v_req;

  -- Write to audit log
  insert into public.audit_log (
    actor_id, action, target_user_id, entity_type, entity_id, old_values, new_values, notes
  ) values (
    auth.uid(),
    'APPROVE_TIMESTAMP_CORRECTION',
    v_req.user_id,
    'attendance',
    v_att.id,
    v_old_att,
    v_new_att,
    p_notes
  );

  return v_req;
end;
$$;

-- Reject Timestamp Correction Request
create or replace function public.reject_edit_request(
  p_request_id uuid,
  p_notes text default null
)
returns public.edit_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.edit_requests;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: Admin privileges required';
  end if;

  select * into v_req from public.edit_requests where id = p_request_id;
  if not found then
    raise exception 'Edit request not found';
  end if;

  if v_req.status != 'pending' then
    raise exception 'Request has already been processed';
  end if;

  update public.edit_requests
  set status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      admin_notes = p_notes
  where id = p_request_id
  returning * into v_req;

  -- Write to audit log
  insert into public.audit_log (actor_id, action, target_user_id, entity_type, entity_id, notes)
  values (
    auth.uid(),
    'REJECT_TIMESTAMP_CORRECTION',
    v_req.user_id,
    'edit_requests',
    p_request_id,
    p_notes
  );

  return v_req;
end;
$$;

-- Admin Assign Task
create or replace function public.admin_assign_task(
  p_user_id uuid,
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
  v_task public.tasks;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: Admin privileges required';
  end if;

  if p_category not in ('Client Work', 'Internal', 'Meeting', 'Learning', 'Other') then
    raise exception 'Invalid category';
  end if;

  insert into public.tasks (user_id, title, category, objective, start_time, status)
  values (p_user_id, p_title, p_category, p_objective, now(), 'carried_over')
  returning * into v_task;

  -- Write to audit log
  insert into public.audit_log (actor_id, action, target_user_id, entity_type, entity_id, new_values)
  values (
    auth.uid(),
    'ADMIN_ASSIGN_TASK',
    p_user_id,
    'tasks',
    v_task.id,
    jsonb_build_object('title', p_title, 'category', p_category, 'objective', p_objective)
  );

  return v_task;
end;
$$;

-- Grant execution to authenticated users
grant execute on function public.review_leave_request(uuid, text, text) to authenticated;
grant execute on function public.approve_edit_request(uuid, text) to authenticated;
grant execute on function public.reject_edit_request(uuid, text) to authenticated;
grant execute on function public.admin_assign_task(uuid, text, text, text) to authenticated;
