-- Comprehensive fix for admin RPC functions
-- Run this in the Supabase SQL Editor with "Run as superuser" checked

-- 1. First, verify the user is correctly set as admin
UPDATE public.profiles
SET role = 'admin', is_admin = true
WHERE id = '61791a7d-2974-4c85-8f1b-861ded6d12a0';

-- 2. Drop existing functions to recreate them correctly
DROP FUNCTION IF EXISTS public.check_user_admin();
DROP FUNCTION IF EXISTS public.check_user_admin_by_id(uuid);
DROP FUNCTION IF EXISTS public.is_user_admin(uuid);

-- 3. Create the no-parameter function for RLS policies
CREATE OR REPLACE FUNCTION public.check_user_admin()
RETURNS boolean AS $$
BEGIN
  -- Return true if the current user has admin role or is_admin flag
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND (role = 'admin' OR is_admin = true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create the parameterized function for checking specific users
CREATE OR REPLACE FUNCTION public.check_user_admin_by_id(user_id UUID)
RETURNS boolean AS $$
BEGIN
  -- Return true if the specified user has admin role or is_admin flag
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = user_id AND (role = 'admin' OR is_admin = true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create alternative function with different parameter name
CREATE OR REPLACE FUNCTION public.is_user_admin(uid UUID)
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

-- 6. Grant execution permissions to all roles
GRANT EXECUTE ON FUNCTION public.check_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.check_user_admin() TO service_role;

GRANT EXECUTE ON FUNCTION public.check_user_admin_by_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_admin_by_id(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.check_user_admin_by_id(UUID) TO service_role;

GRANT EXECUTE ON FUNCTION public.is_user_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_admin(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.is_user_admin(UUID) TO service_role;

-- 7. Fix RLS policies that might be causing issues
-- First, drop the existing policy
DROP POLICY IF EXISTS admin_full_access ON public.profiles;

-- Recreate the policy with proper syntax
CREATE POLICY admin_full_access ON public.profiles
  USING (check_user_admin());

-- 8. Make sure public.profiles has correct RLS settings
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 9. Verify the functions work correctly
SELECT check_user_admin_by_id('61791a7d-2974-4c85-8f1b-861ded6d12a0') AS check_admin_by_id_result;
SELECT is_user_admin('61791a7d-2974-4c85-8f1b-861ded6d12a0') AS is_admin_result;

-- 10. Add a new policy to ensure the admin can update their own profile
CREATE POLICY admin_update_own_profile ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);
