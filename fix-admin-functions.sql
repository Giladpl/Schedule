-- Fix for admin check functions
-- Run this in the Supabase SQL Editor with "Run as superuser" to fix admin check issues

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS public.check_user_admin(uuid);
DROP FUNCTION IF EXISTS public.is_user_admin(uuid);

-- Recreate check_user_admin - this handles checking admin status reliably
CREATE OR REPLACE FUNCTION public.check_user_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Return true if the user is in the profiles table with admin role or is_admin flag
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = user_id AND (role = 'admin' OR is_admin = true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate is_user_admin - alternative version with different parameter name
CREATE OR REPLACE FUNCTION public.is_user_admin(uid uuid)
RETURNS boolean AS $$
BEGIN
  -- Return true if the user is in the profiles table with admin role or is_admin flag
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = uid AND (role = 'admin' OR is_admin = true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions on these functions
GRANT EXECUTE ON FUNCTION public.check_user_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_admin(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.check_user_admin(uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.is_user_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_admin(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_user_admin(uuid) TO service_role;

-- Add explicit profile fixing for the user having issues
UPDATE public.profiles
SET
  role = 'admin',
  is_admin = true,
  updated_at = now()
WHERE id = '61791a7d-2974-4c85-8f1b-861ded6d12a0';

-- Verify functions are created correctly
SELECT
  proname AS function_name,
  prosecdef AS security_definer
FROM pg_proc
WHERE proname IN ('check_user_admin', 'is_user_admin')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Check if user is now recognized as admin
SELECT check_user_admin('61791a7d-2974-4c85-8f1b-861ded6d12a0') as is_admin_check;
