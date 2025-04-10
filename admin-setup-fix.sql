-- This script helps fix issues with admin user creation in Supabase
-- Run this in the Supabase SQL Editor with "Run as superuser" enabled

-- 1. Check if profiles table exists and create it if needed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'profiles'
    ) THEN
        CREATE TABLE public.profiles (
            id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
            email text NOT NULL,
            role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
            is_admin boolean NOT NULL DEFAULT false,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
        );

        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

        -- Policies
        CREATE POLICY "Users can view their own profile"
            ON profiles FOR SELECT
            USING (auth.uid() = id);

        CREATE POLICY "Users can update their own profile"
            ON profiles FOR UPDATE
            USING (auth.uid() = id)
            WITH CHECK (auth.uid() = id AND (auth.uid() = id AND role = 'user'));

        CREATE POLICY "Admins can view all profiles"
            ON profiles FOR SELECT
            USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin' OR is_admin = true));

        CREATE POLICY "Admins can update all profiles"
            ON profiles FOR UPDATE
            USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin' OR is_admin = true));
    ELSE
        -- Check if is_admin column exists and add it if needed
        IF NOT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'profiles'
            AND column_name = 'is_admin'
        ) THEN
            ALTER TABLE public.profiles ADD COLUMN is_admin boolean NOT NULL DEFAULT false;
        END IF;
    END IF;
END
$$;

-- 2. Create/Replace the set_user_as_admin function
CREATE OR REPLACE FUNCTION public.set_user_as_admin(user_id uuid)
RETURNS boolean AS $$
DECLARE
  success boolean;
BEGIN
  UPDATE public.profiles
  SET
    role = 'admin',
    is_admin = true,
    updated_at = now()
  WHERE id = user_id;

  -- Check if the update was successful
  GET DIAGNOSTICS success = ROW_COUNT;
  RETURN success > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create/Replace the create_admin_profile function
CREATE OR REPLACE FUNCTION public.create_admin_profile(user_id uuid, user_email text)
RETURNS boolean AS $$
DECLARE
  profile_exists boolean;
BEGIN
  -- Check if profile already exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = user_id) INTO profile_exists;

  IF profile_exists THEN
    -- Update existing profile to admin
    UPDATE public.profiles
    SET
      role = 'admin',
      is_admin = true,
      updated_at = now()
    WHERE id = user_id;
  ELSE
    -- Create new admin profile
    INSERT INTO public.profiles (id, email, role, is_admin)
    VALUES (user_id, user_email, 'admin', true);
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create/Replace the handle_new_user function and trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, is_admin)
  VALUES (new.id, new.email, 'user', false);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Create/Replace the set_current_timestamp_updated_at function and trigger
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate it
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- 6. Create profiles for any existing users without profiles
INSERT INTO public.profiles (id, email, role, is_admin)
SELECT
  au.id,
  au.email,
  'user',
  false
FROM
  auth.users au
LEFT JOIN
  public.profiles p ON au.id = p.id
WHERE
  p.id IS NULL;

-- 7. Verify the setup
DO $$
DECLARE
  trigger_exists boolean;
  profiles_count int;
  users_count int;
BEGIN
  -- Check if trigger exists
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) INTO trigger_exists;

  -- Count users vs profiles
  SELECT COUNT(*) FROM auth.users INTO users_count;
  SELECT COUNT(*) FROM public.profiles INTO profiles_count;

  RAISE NOTICE 'Setup verification:';
  RAISE NOTICE '- on_auth_user_created trigger exists: %', trigger_exists;
  RAISE NOTICE '- Users in auth.users: %', users_count;
  RAISE NOTICE '- Profiles in public.profiles: %', profiles_count;

  IF users_count > profiles_count THEN
    RAISE NOTICE 'WARNING: There are % users without profiles!', users_count - profiles_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All users have profiles';
  END IF;
END
$$;
