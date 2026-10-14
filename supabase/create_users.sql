-- ==============================================================================
-- SEED USERS: 1 Admin and 1 Employee
-- Run this script in your Supabase project's SQL Editor.
-- ==============================================================================

-- Enable pgcrypto for password hashing
create extension if not exists pgcrypto;

do $$
declare
  v_admin_id uuid := gen_random_uuid();
  v_admin_email text := 'admin@company.com';
  v_admin_password text := 'Admin1234!';

  v_emp_id uuid := gen_random_uuid();
  v_emp_email text := 'employee@company.com';
  v_emp_password text := 'Employee1234!';
begin

  -- ----------------------------------------------------------------------------
  -- 1. ADMIN USER
  -- ----------------------------------------------------------------------------
  if not exists (select 1 from auth.users where email = v_admin_email) then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_admin_id,
      'authenticated',
      'authenticated',
      v_admin_email,
      crypt(v_admin_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Admin User","role":"admin"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      v_admin_id,
      v_admin_id,
      format('{"sub":"%s","email":"%s"}', v_admin_id::text, v_admin_email)::jsonb,
      'email',
      v_admin_id::text,
      now(),
      now(),
      now()
    );

    insert into public.profiles (id, full_name, role)
    values (v_admin_id, 'Admin User', 'admin')
    on conflict (id) do update
    set full_name = 'Admin User', role = 'admin';
  else
    -- Admin exists in auth.users, ensure public.profiles row exists
    select id into v_admin_id from auth.users where email = v_admin_email;
    insert into public.profiles (id, full_name, role)
    values (v_admin_id, 'Admin User', 'admin')
    on conflict (id) do update
    set full_name = 'Admin User', role = 'admin';
  end if;

  -- ----------------------------------------------------------------------------
  -- 2. EMPLOYEE USER
  -- ----------------------------------------------------------------------------
  if not exists (select 1 from auth.users where email = v_emp_email) then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_emp_id,
      'authenticated',
      'authenticated',
      v_emp_email,
      crypt(v_emp_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Employee User","role":"employee"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      v_emp_id,
      v_emp_id,
      format('{"sub":"%s","email":"%s"}', v_emp_id::text, v_emp_email)::jsonb,
      'email',
      v_emp_id::text,
      now(),
      now(),
      now()
    );

    insert into public.profiles (id, full_name, role)
    values (v_emp_id, 'Employee User', 'employee')
    on conflict (id) do update
    set full_name = 'Employee User', role = 'employee';
  else
    -- Employee exists in auth.users, ensure public.profiles row exists
    select id into v_emp_id from auth.users where email = v_emp_email;
    insert into public.profiles (id, full_name, role)
    values (v_emp_id, 'Employee User', 'employee')
    on conflict (id) do update
    set full_name = 'Employee User', role = 'employee';
  end if;

end $$;
