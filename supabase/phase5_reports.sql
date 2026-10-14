-- ==============================================================================
-- PHASE 5: REPORT AGGREGATION RPC
-- Run this script in your Supabase project's SQL Editor.
-- Provides server-side aggregation for daily, weekly, and monthly reports.
-- ==============================================================================

create or replace function public.get_report_summary(
  p_target_user_id uuid default null,
  p_start_date date default ((now() at time zone 'Asia/Karachi')::date - 30),
  p_end_date date default (now() at time zone 'Asia/Karachi')::date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_is_admin boolean := public.is_admin();
  v_effective_user_id uuid;
  v_result jsonb;
begin
  if v_caller_id is null then
    raise exception 'Unauthorized';
  end if;

  -- Security check: non-admins can only view their own data
  if not v_is_admin then
    v_effective_user_id := v_caller_id;
  else
    v_effective_user_id := p_target_user_id; -- Can be null for "All employees"
  end if;

  with att_data as (
    select
      a.id,
      a.user_id,
      p.full_name as employee_name,
      a.work_date,
      a.check_in,
      a.check_out,
      a.status,
      a.auto_closed,
      case
        when a.check_in is not null and a.check_out is not null and a.check_out > a.check_in
        then extract(epoch from (a.check_out - a.check_in))
        else 0
      end as duration_seconds
    from public.attendance a
    join public.profiles p on p.id = a.user_id
    where a.work_date between p_start_date and p_end_date
      and (v_effective_user_id is null or a.user_id = v_effective_user_id)
  ),
  tsk_data as (
    select
      t.id,
      t.user_id,
      p.full_name as employee_name,
      t.title,
      t.category,
      t.objective,
      t.outcome,
      t.status,
      t.start_time,
      t.end_time,
      (t.start_time at time zone 'Asia/Karachi')::date as task_date,
      case
        when t.start_time is not null and t.end_time is not null and t.end_time > t.start_time
        then extract(epoch from (t.end_time - t.start_time))
        else 0
      end as duration_seconds
    from public.tasks t
    join public.profiles p on p.id = t.user_id
    where (t.start_time at time zone 'Asia/Karachi')::date between p_start_date and p_end_date
      and (v_effective_user_id is null or t.user_id = v_effective_user_id)
  ),
  category_summary as (
    select
      category,
      coalesce(round(sum(duration_seconds) / 3600.0, 2), 0) as hours
    from tsk_data
    group by category
  ),
  daily_hours_summary as (
    select
      work_date,
      round(sum(duration_seconds) / 3600.0, 2) as total_hours,
      count(*) as records_count
    from att_data
    group by work_date
    order by work_date asc
  )
  select jsonb_build_object(
    'period', jsonb_build_object(
      'start_date', p_start_date,
      'end_date', p_end_date
    ),
    'metrics', jsonb_build_object(
      'total_seconds_worked', coalesce((select sum(duration_seconds) from att_data), 0),
      'total_hours_worked', coalesce(round((select sum(duration_seconds) from att_data) / 3600.0, 2), 0),
      'days_logged', (select count(distinct work_date) from att_data),
      'days_present', (select count(*) from att_data where status in ('present', 'late')),
      'days_late', (select count(*) from att_data where status = 'late'),
      'tasks_total', (select count(*) from tsk_data),
      'tasks_completed', (select count(*) from tsk_data where status = 'done'),
      'tasks_blocked', (select count(*) from tsk_data where status = 'blocked'),
      'tasks_carried_over', (select count(*) from tsk_data where status = 'carried_over'),
      'avg_task_duration_minutes', coalesce(
        round((select avg(duration_seconds) from tsk_data where duration_seconds > 0) / 60.0, 1),
        0
      )
    ),
    'category_hours', coalesce(
      (select jsonb_object_agg(category, hours) from category_summary),
      '{}'::jsonb
    ),
    'daily_breakdown', coalesce(
      (select jsonb_agg(
        jsonb_build_object(
          'date', work_date,
          'hours', total_hours,
          'count', records_count
        )
      ) from daily_hours_summary),
      '[]'::jsonb
    ),
    'attendance', coalesce(
      (select jsonb_agg(to_jsonb(a)) from att_data a),
      '[]'::jsonb
    ),
    'tasks', coalesce(
      (select jsonb_agg(to_jsonb(t)) from tsk_data t),
      '[]'::jsonb
    )
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.get_report_summary(uuid, date, date) to authenticated;
