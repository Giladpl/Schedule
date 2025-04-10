-- Admin Login Fix Script
-- Run this to verify and fix admin status for a specific user

-- Replace with your user ID
\set user_id '61791a7d-2974-4c85-8f1b-861ded6d12a0'

-- Check current status
SELECT
  'CURRENT STATUS' as check_type,
  id,
  email,
  role,
  is_admin
FROM
  public.profiles
WHERE
  id = :'user_id';

-- Fix the profile if needed
DO $$
DECLARE
  user_exists boolean;
  user_email text;
BEGIN
  -- Check if user exists in auth.users
  SELECT
    EXISTS(SELECT 1 FROM auth.users WHERE id = '61791a7d-2974-4c85-8f1b-861ded6d12a0'),
    email INTO user_exists, user_email
  FROM auth.users
  WHERE id = '61791a7d-2974-4c85-8f1b-861ded6d12a0';

  IF user_exists THEN
    -- Check if profile exists
    IF EXISTS(SELECT 1 FROM public.profiles WHERE id = '61791a7d-2974-4c85-8f1b-861ded6d12a0') THEN
      -- Update existing profile to ensure admin privileges
      UPDATE public.profiles
      SET
        role = 'admin',
        is_admin = true,
        updated_at = now()
      WHERE id = '61791a7d-2974-4c85-8f1b-861ded6d12a0';

      RAISE NOTICE 'Updated existing profile to admin status';
    ELSE
      -- Create a new profile with admin privileges
      INSERT INTO public.profiles (id, email, role, is_admin, created_at, updated_at)
      VALUES (
        '61791a7d-2974-4c85-8f1b-861ded6d12a0',
        user_email,
        'admin',
        true,
        now(),
        now()
      );

      RAISE NOTICE 'Created new admin profile for user';
    END IF;
  ELSE
    RAISE NOTICE 'User does not exist in auth.users';
  END IF;
END
$$;

-- Verify fix was applied
SELECT
  'UPDATED STATUS' as check_type,
  id,
  email,
  role,
  is_admin
FROM
  public.profiles
WHERE
  id = :'user_id';
