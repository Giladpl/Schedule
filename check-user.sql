-- Check user admin status
-- Run this in the Supabase SQL Editor to verify your admin status

-- First check for the profile in the profiles table
SELECT
  id,
  email,
  role,
  is_admin,
  created_at,
  updated_at
FROM
  public.profiles
WHERE
  id = '61791a7d-2974-4c85-8f1b-861ded6d12a0';

-- Check authentication user
SELECT id, email, email_confirmed_at, confirmed_at, role
FROM auth.users
WHERE id = '61791a7d-2974-4c85-8f1b-861ded6d12a0';

-- Test RPC functions
SELECT check_user_admin('61791a7d-2974-4c85-8f1b-861ded6d12a0') AS is_admin_via_check_function;
SELECT is_user_admin('61791a7d-2974-4c85-8f1b-861ded6d12a0') AS is_admin_via_is_function;

-- Verify RPC functions exist
SELECT
  proname AS function_name,
  proargtypes,
  prosecdef AS security_definer
FROM
  pg_proc
WHERE
  proname IN ('check_user_admin', 'is_user_admin')
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Fix admin status (if needed)
/*
UPDATE public.profiles
SET role = 'admin', is_admin = true
WHERE id = '61791a7d-2974-4c85-8f1b-861ded6d12a0';
*/
