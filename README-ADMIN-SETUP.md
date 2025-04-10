# Admin User Setup Guide

This guide explains how to properly set up admin users in the Schedule App using Supabase.

## Background

The application uses Supabase's authentication system combined with a custom `profiles` table that stores user roles and permissions. When a user is created through the Supabase Auth system, they need a corresponding record in the `profiles` table with admin privileges to access the admin features.

## Initial Database Setup

Before creating users, make sure the database schema is properly set up:

1. Go to the Supabase dashboard for your project
2. Navigate to the SQL Editor
3. Copy the contents of the `supabase-setup.sql` file from this project
4. Run the SQL to create the necessary tables, functions, and triggers

## Creating an Admin User

There are 3 ways to set up an admin user:

### Method 1: Create a User Through Supabase Dashboard and Promote to Admin

1. Go to the Supabase Dashboard > Authentication > Users
2. Click "Add User" and enter the user's email and password
3. Once created, copy the user's UUID
4. Go to the SQL Editor and run:

```sql
-- Method 1: Use the function we created to promote a user to admin
SELECT set_user_as_admin('paste-user-uuid-here');
```

### Method 2: Create a User and Admin Profile in One Step

1. Go to the SQL Editor and run:

```sql
-- Method 2: Create a user and admin profile in one transaction
BEGIN;
  -- First create the user in auth.users
  INSERT INTO auth.users (
    id, email, raw_user_meta_data, raw_app_meta_data, is_anonymous, created_at, updated_at, email_confirmed_at
  ) VALUES (
    uuid_generate_v4(), -- Generate a random UUID
    'admin@example.com', -- Replace with desired email
    '{"name":"Admin User"}', -- Set any metadata you want
    '{"provider":"email"}',
    false,
    now(),
    now(),
    now() -- Set email as confirmed
  ) RETURNING id INTO user_id;

  -- Then create the admin profile
  INSERT INTO public.profiles (id, email, role, is_admin)
  SELECT id, email, 'admin', true FROM auth.users
  WHERE email = 'admin@example.com'; -- Match the email from above
COMMIT;
```

### Method 3: Use the Browser Console to Promote an Existing User

1. Sign in to the application with the user you want to promote
2. Open your browser's developer console (F12)
3. Run the following JavaScript code:

```javascript
// Method 3: Run the setupAdmin function in the browser
window.setupAdmin();
```

## Troubleshooting

If you get errors when creating users via the Supabase dashboard:

1. **Missing Profile**: The user might be created in auth.users but not have a corresponding profile.

   - Solution: Run `SELECT create_admin_profile('user-uuid-here', 'user-email-here');`

2. **Trigger Not Working**: The automatic trigger might not be running.

   - Solution: Check if the trigger exists with `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`
   - If missing, re-run the setup SQL

3. **Permission Issues**: Row Level Security might be preventing operations.
   - Solution: In the SQL Editor, enable the "Run as superuser" option when executing queries

## Verifying Admin Status

To check if a user has admin privileges:

```sql
SELECT id, email, role, is_admin FROM profiles
WHERE id = 'user-uuid-here';
```

A user has admin access if either:

- `role` is set to 'admin' OR
- `is_admin` is set to true

## Best Practices

1. Create a dedicated admin account for system management
2. Use a strong, unique password for admin accounts
3. Consider using Supabase's invite functionality for new admins
4. Always have at least two admin users in case one account is locked out
