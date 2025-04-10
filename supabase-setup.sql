-- Create a profiles table to store user role information
-- This table will be linked to auth.users and will include the role field for admin access

-- Create profiles table
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create RLS (Row Level Security) policies
alter table public.profiles enable row level security;

-- Create policy to allow users to view their own profile
create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

-- Create policy to allow users to update their own profile (excluding role)
create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id AND (auth.uid() = id AND role = 'user'));

-- Create policy for admins to view and edit any profile
create policy "Admins can view all profiles"
  on profiles for select
  using (auth.uid() in (select id from public.profiles where role = 'admin' OR is_admin = true));

create policy "Admins can update all profiles"
  on profiles for update
  using (auth.uid() in (select id from public.profiles where role = 'admin' OR is_admin = true));

-- Create a trigger to automatically create a profile when a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role, is_admin)
  values (new.id, new.email, 'user', false);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create a function to update the updated_at field
create or replace function public.set_current_timestamp_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_current_timestamp_updated_at();

-- Function to easily set a user as admin through the dashboard
create or replace function public.set_user_as_admin(user_id uuid)
returns boolean as $$
declare
  success boolean;
begin
  update public.profiles
  set
    role = 'admin',
    is_admin = true,
    updated_at = now()
  where id = user_id;

  -- Check if the update was successful
  GET DIAGNOSTICS success = ROW_COUNT;
  return success > 0;
end;
$$ language plpgsql security definer;

-- Function to create a profile if it doesn't exist (useful for manually created users)
create or replace function public.create_profiles_table()
returns void as $$
begin
  -- This function is called by the setup-admin script if the profiles table doesn't exist
  -- Table creation is already handled in this file, so this is just a placeholder
  return;
end;
$$ language plpgsql security definer;

-- Function to create admin profiles for existing users
create or replace function public.create_admin_profile(user_id uuid, user_email text)
returns boolean as $$
declare
  profile_exists boolean;
begin
  -- Check if profile already exists
  select exists(select 1 from public.profiles where id = user_id) into profile_exists;

  if profile_exists then
    -- Update existing profile to admin
    update public.profiles
    set
      role = 'admin',
      is_admin = true,
      updated_at = now()
    where id = user_id;
  else
    -- Create new admin profile
    insert into public.profiles (id, email, role, is_admin)
    values (user_id, user_email, 'admin', true);
  end if;

  return true;
end;
$$ language plpgsql security definer;
