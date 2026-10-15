-- ==============================================================================
-- PHASE 7: AUTOMATIC SHIFT AUTO-CLOSE JOB (11:59 PM ASIA/KARACHI)
-- Run this script in your Supabase SQL Editor.
-- ==============================================================================

-- 1. Create the auto-close procedure
create or replace function public.auto_close_unclosed_shifts()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_karachi_today date := (now() at time zone 'Asia/Karachi')::date;
  v_end_of_day timestamptz := ((v_karachi_today || ' 23:59:59')::timestamp at time zone 'Asia/Karachi');
  v_closed_attendance_count int := 0;
  v_closed_task_count int := 0;
begin
  -- 1. Auto-close any unclosed attendance records for today (or past days)
  with updated_attendance as (
    update public.attendance
    set check_out = v_end_of_day,
        auto_closed = true
    where check_out is null
      and check_in is not null
      and work_date <= v_karachi_today
    returning id, user_id
  )
  select count(*) into v_closed_attendance_count from updated_attendance;

  -- 2. End any running tasks that were left open by employees
  with updated_tasks as (
    update public.tasks
    set end_time = v_end_of_day,
        status = 'carried_over',
        outcome = coalesce(outcome, 'Auto-closed at end of day (11:59 PM PKT)')
    where status = 'in_progress'
      and (start_time at time zone 'Asia/Karachi')::date <= v_karachi_today
    returning id, user_id
  )
  select count(*) into v_closed_task_count from updated_tasks;

  -- 3. Log to audit_log
  if v_closed_attendance_count > 0 or v_closed_task_count > 0 then
    insert into public.audit_log (
      actor_id,
      action,
      entity_type,
      notes
    ) values (
      '00000000-0000-0000-0000-000000000000',
      'SYSTEM_AUTO_CLOSE_SHIFTS',
      'attendance',
      format('Auto-closed %s attendance records and %s tasks at 11:59 PM PKT for date %s',
        v_closed_attendance_count, v_closed_task_count, v_karachi_today)
    );
  end if;

  return jsonb_build_object(
    'date', v_karachi_today,
    'closed_attendance', v_closed_attendance_count,
    'closed_tasks', v_closed_task_count
  );
end;
$$;

grant execute on function public.auto_close_unclosed_shifts() to authenticated;
grant execute on function public.auto_close_unclosed_shifts() to service_role;

-- ------------------------------------------------------------------------------
-- 2. CRON SCHEDULING (Via pg_cron in Supabase)
-- Note: 11:59 PM PKT (Asia/Karachi, UTC+5) is 18:59 UTC (6:59 PM UTC).
-- Cron schedule: 59 18 * * * (runs every day at 18:59 UTC / 23:59 PKT).
-- ------------------------------------------------------------------------------

-- Enable pg_cron if available
create extension if not exists pg_cron;

-- Unschedule previous job if exists to avoid duplicates
do $$
begin
  if exists (select 1 from cron.job where jobname = 'auto_close_karachi_shifts_job') then
    perform cron.unschedule('auto_close_karachi_shifts_job');
  end if;
exception when others then
  -- pg_cron schema may not exist on some tiers; ignore safely
end $$;

-- Schedule the job to run daily at 23:59 Asia/Karachi (18:59 UTC)
do $$
begin
  perform cron.schedule(
    'auto_close_karachi_shifts_job',
    '59 18 * * *',
    'select public.auto_close_unclosed_shifts();'
  );
exception when others then
  raise notice 'pg_cron not enabled or supported on this tier. The function public.auto_close_unclosed_shifts() can also be invoked via an edge function, cron webhook, or admin dashboard.';
end $$;
