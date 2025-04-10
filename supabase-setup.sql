-- Create a profiles table to store user role information
-- This table will be linked to auth.users and will include the role field for admin access

-- Create profiles table
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
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
  using (auth.uid() in (select id from public.profiles where role = 'admin'));

create policy "Admins can update all profiles"
  on profiles for update
  using (auth.uid() in (select id from public.profiles where role = 'admin'));

-- Create a trigger to automatically create a profile when a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user');
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
