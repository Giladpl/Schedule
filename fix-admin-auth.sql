-- Fix user role in the auth.users table
-- Run this in the Supabase SQL Editor with "Run as superuser" checked

-- Check current role
SELECT id, email, role FROM auth.users WHERE id = '61791a7d-2974-4c85-8f1b-861ded6d12a0';

-- Update the role to service_role (the admin role in Supabase auth)
UPDATE auth.users
SET role = 'service_role'
WHERE id = '61791a7d-2974-4c85-8f1b-861ded6d12a0';

-- Verify the change
SELECT id, email, role FROM auth.users WHERE id = '61791a7d-2974-4c85-8f1b-861ded6d12a0';

-- Optional: Update app_metadata to include admin flag
UPDATE auth.users
SET raw_app_meta_data =
  raw_app_meta_data ||
  '{"is_admin": true}'::jsonb
WHERE id = '61791a7d-2974-4c85-8f1b-861ded6d12a0';

-- Also ensure the profile record is correct
UPDATE public.profiles
SET role = 'admin', is_admin = true
WHERE id = '61791a7d-2974-4c85-8f1b-861ded6d12a0';

-- Final verification that everything is set correctly
SELECT
  u.id,
  u.email,
  u.role AS auth_role,
  p.role AS profile_role,
  p.is_admin,
  check_user_admin_by_id(u.id) AS admin_check,
  is_user_admin(u.id) AS is_admin_check
FROM
  auth.users u
  JOIN public.profiles p ON u.id = p.id
WHERE
  u.id = '61791a7d-2974-4c85-8f1b-861ded6d12a0';
