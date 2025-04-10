-- Additional RPC functions for checking admin status
-- Run this in the Supabase SQL Editor with "Run as superuser" checked

-- Function to directly check if a user is an admin
CREATE OR REPLACE FUNCTION public.check_user_admin(user_id uuid)
RETURNS boolean AS $$
DECLARE
  is_admin_user boolean;
BEGIN
  SELECT
    (role = 'admin' OR is_admin = true) INTO is_admin_user
  FROM
    public.profiles
  WHERE
    id = user_id;

  -- Return false if no profile found
  RETURN COALESCE(is_admin_user, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alternative function with different parameter name
CREATE OR REPLACE FUNCTION public.is_user_admin(uid uuid)
RETURNS boolean AS $$
DECLARE
  is_admin_user boolean;
BEGIN
  SELECT
    (role = 'admin' OR is_admin = true) INTO is_admin_user
  FROM
    public.profiles
  WHERE
    id = uid;

  -- Return false if no profile found
  RETURN COALESCE(is_admin_user, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make sure RLS policies allow these functions to be called
BEGIN;
  -- Drop existing policies if they might interfere
  DROP POLICY IF EXISTS "RPC can check admin status" ON public.profiles;

  -- Create policy to allow RPC functions to access profiles
  CREATE POLICY "RPC can check admin status"
    ON public.profiles
    FOR SELECT
    USING (true);

  -- Grant permissions needed for RPC functions
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
  GRANT EXECUTE ON FUNCTION public.check_user_admin TO anon, authenticated, service_role;
  GRANT EXECUTE ON FUNCTION public.is_user_admin TO anon, authenticated, service_role;
COMMIT;

-- Verify the functions exist
SELECT
  proname AS function_name,
  prosrc AS source_code
FROM
  pg_proc
WHERE
  proname IN ('check_user_admin', 'is_user_admin')
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Test the functions with your user ID
SELECT check_user_admin('61791a7d-2974-4c85-8f1b-861ded6d12a0') AS is_admin_via_check;
SELECT is_user_admin('61791a7d-2974-4c85-8f1b-861ded6d12a0') AS is_admin_via_is;
