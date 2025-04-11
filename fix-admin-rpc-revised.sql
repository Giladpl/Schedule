-- Revised fix for admin RPC functions
-- Run this in the Supabase SQL Editor with "Run as superuser" checked

-- 1. First, verify the user is correctly set as admin
UPDATE public.profiles
SET role = 'admin', is_admin = true
WHERE id = '61791a7d-2974-4c85-8f1b-861ded6d12a0';

-- 2. APPROACH: Update functions instead of dropping them

-- Update the existing check_user_admin() function
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

-- Create the parameterized function for checking specific users
-- This is a new function so we can create it
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

-- Create alternative function with different parameter name
-- This is a new function so we can create it
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

-- 3. Grant execution permissions to all roles
GRANT EXECUTE ON FUNCTION public.check_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.check_user_admin() TO service_role;

GRANT EXECUTE ON FUNCTION public.check_user_admin_by_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_admin_by_id(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.check_user_admin_by_id(UUID) TO service_role;

GRANT EXECUTE ON FUNCTION public.is_user_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_admin(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.is_user_admin(UUID) TO service_role;

-- 4. Leave the existing policy as is, since it's working with the function
-- But let's create an additional policy for authenticated users to read their own profile
CREATE POLICY IF NOT EXISTS users_read_own_profile ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 5. Make sure public.profiles has correct RLS settings
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6. Verify the functions work correctly
SELECT check_user_admin_by_id('61791a7d-2974-4c85-8f1b-861ded6d12a0') AS check_admin_by_id_result;
SELECT is_user_admin('61791a7d-2974-4c85-8f1b-861ded6d12a0') AS is_admin_result;

-- 7. Add a policy to ensure the admin can update their own profile (if it doesn't exist)
CREATE POLICY IF NOT EXISTS admin_update_own_profile ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);
