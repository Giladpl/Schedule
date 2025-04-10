# Authentication Setup for Schedule App

This document describes how to set up authentication for the Schedule App using Supabase.

## Prerequisites

- Supabase account
- Supabase project already set up (using the credentials in `.env`)

## Database Setup

1. Run the `supabase-setup.sql` script in the Supabase SQL Editor to create the necessary tables and functions.

2. The script will create:
   - A `profiles` table linked to Supabase Auth users
   - Row Level Security (RLS) policies
   - Triggers to automatically create a profile when a user signs up

## Creating Admin Users

To create an admin user:

1. Create a new user in the Supabase Authentication section (or let them sign up)
2. After the user is created, run the following SQL in the Supabase SQL Editor to make them an admin:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'admin@example.com'; -- Replace with the admin's email
```

## Authentication Flow

1. Regular users can access the calendar and book appointments without logging in
2. Only admins can access the admin area by going to `/admin` and signing in
3. Once authenticated as an admin, users can:
   - See all appointments
   - Switch between admin view and client view
   - Manage the calendar
   - Log out from the system

## Front-end Authentication

The front-end uses:

1. `AuthContext.tsx` - Context provider for authentication state
2. `LoginForm.tsx` - Component for admin login
3. `ProtectedRoute.tsx` - Component to protect admin routes
4. `LogoutButton.tsx` - Component for logging out

## Environment Variables

The application uses these environment variables for Supabase authentication:

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

These are already set up in the `.env` files.

## Testing Authentication

To test authentication:

1. Create an admin user as described above
2. Access `/admin` to log in with the admin credentials
3. You should be able to see the admin view of the calendar
4. Regular users who try to access `/admin` will be redirected to the login page
5. Non-admin users who try to log in will not be able to access the admin view
