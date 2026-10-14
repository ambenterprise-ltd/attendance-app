# PROJECT: Team Attendance + Task Time-Tracking Web App

## Overview
Internal web app for a company of 3-4 employees. Employees check in/out,
log tasks with a start time and objective, then end tasks with an outcome.
All timestamps are stored so we can produce daily, weekly and monthly
performance reports. Admin can see everything.

## Stack
- Vite + React + TypeScript
- Tailwind CSS
- React Router
- Supabase (Postgres + Auth), client library @supabase/supabase-js
- Deployed on Vercel (Vercel does the production build)
- Charts: Recharts (ask before installing)

## Environment
- Windows machine, low resources. Keep things lightweight.
- Env vars (already in .env, never commit it, never print the values):
  VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (a publishable key).
- NEVER use or ask for the Supabase secret/service_role key in frontend code.
- Timezone: Asia/Karachi. Times are stored as timestamptz and displayed in
  Asia/Karachi.

## HARD WORKING RULES
1. Work ONE phase at a time. After finishing a phase, STOP, summarize what
   you built and how to test it, and wait for me to say "go phase N".
2. NEVER run `npm run build`. Only use `npm run dev` for checking.
3. Do not install any library without asking first (except those listed in
   the Stack).
4. Never create, change or delete database tables yourself. The database
   already exists. If you need a DB change, write a SQL file in /supabase
   and tell me to run it in the Supabase SQL editor.
5. All check-in/out and task start/end timestamps come from Postgres
   (server side) via the RPC functions below. NEVER use the browser clock
   (new Date()) to create these timestamps. The browser clock may only be
   used to display a live running timer.
6. Keep code simple and readable. Mobile-friendly UI. Show loading and
   error states. Show friendly error messages from the RPC exceptions.
7. Folder structure: src/pages, src/components, src/lib, src/hooks,
   src/context, supabase/.
8. Commit nothing yourself. I handle git.

## EXISTING DATABASE (already created in Supabase, do not recreate)
Tables (all have Row Level Security enabled):
- profiles(id uuid = auth user id, full_name, role 'admin'|'employee',
  created_at)
- attendance(id, user_id, work_date date, check_in timestamptz,
  check_out timestamptz, status 'present'|'late'|'absent'|'leave'|
  'half_day', auto_closed boolean, unique(user_id, work_date))
- tasks(id, user_id, title, category, objective, start_time timestamptz,
  end_time timestamptz, outcome, status 'in_progress'|'done'|'blocked'|
  'carried_over'). One in_progress task per user max.

RPC functions (call with supabase.rpc, only for logged-in users):
- check_in()
- check_out()  (fails if the user has a running task)
- start_task(p_title, p_category, p_objective)  (requires being checked in)
- end_task(p_task_id, p_outcome, p_status)  (status: done|blocked|
  carried_over)

Security: employees can only SELECT their own rows. Admins can SELECT all
rows. Employees cannot insert or update tables directly; they only use the
RPC functions. Public signup is disabled; admins create users in the
Supabase dashboard. Late rule: check-in after 09:15 Karachi time = 'late'.

## PHASES (do only when I say "go phase N")

### Phase 1: Scaffold
Create the Vite + React + TypeScript project IN THE CURRENT FOLDER (not a
subfolder; keep the existing .env and AGENTS.md). Add Tailwind CSS, React
Router, @supabase/supabase-js. Create src/lib/supabase.ts using the env
vars. Create a layout with a top navbar (app name, user name, logout) and
routes: /login, /dashboard, /tasks, /reports, /admin as placeholders. Add
.env.example and a .gitignore excluding node_modules, .env, dist. Run
`npm run dev` and give me the local URL.

### Phase 2: Auth and roles
Email/password login page (/login). Auth context that loads the session and
the user's profile (role, full_name). Protected route wrapper redirecting to
/login. Admin-only wrapper for /admin. No public signup page. Handle
session expiry and logout.

### Phase 3: Attendance (/dashboard)
Large Check In / Check Out buttons using the RPC functions. Show today's
status, check-in and check-out times (Asia/Karachi), a live timer of hours
worked today. Disable buttons correctly. Below, show this month's
attendance as a table or calendar with colored status badges and total
hours per day.

### Phase 4: Tasks (/tasks)
If no running task: "Start Task" form (title, category dropdown, objective)
calling start_task. If running: card with title, objective, start time,
live timer, and an "End Task" form (outcome, status done/blocked/
carried_over) calling end_task. Below, today's task list with start, end
and duration. Categories: Client Work, Internal, Meeting, Learning, Other.

### Phase 5: Reports (/reports)
Tabs Daily / Weekly / Monthly with a date picker. Employees see own data;
admins can choose any employee. Metrics: total hours, attendance %, late
count, tasks completed, average task duration, hours per category, planned
vs completed tasks. Bar chart of hours per day. Export CSV. Prefer
aggregation via SQL views/RPC (write the SQL file for me to run) over heavy
client-side computing.

### Phase 6: Admin (/admin)
Live view of who is checked in and their current task; employee list with
monthly summary. Write SQL (for me to run) for extra tables: leaves,
edit_requests, audit_log with RLS, then build: leave request and approval,
timestamp correction requests with approval (applies the change and writes
an audit_log entry), and admin task assignment.

### Phase 7: Polish and safety review
Review for missing loading/error states, mobile layout, session expiry,
RLS gaps, and forgotten check-outs (write SQL for an auto-close job at
11:59 PM Karachi that sets auto_closed = true). LIST the problems first and
wait for approval before fixing.

### Phase 8: Deployment help
Prepare the project for Vercel: confirm vercel.json SPA rewrite for React
Router, list the env vars to add in Vercel, and give a deployment
checklist. Do not run a production build.

## START
Read this whole file, confirm you understood the rules, and wait for me to
say "go phase 1".