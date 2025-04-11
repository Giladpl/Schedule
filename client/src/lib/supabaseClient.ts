import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client with environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("🔑 Supabase URL present:", !!supabaseUrl);
console.log("🔑 Supabase Anon Key present:", !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
console.log("🔌 Supabase client initialized");

// Auth helper functions
export async function signIn(email: string, password: string) {
  console.log("🔑 Attempting sign in for:", email);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("❌ Sign in error:", error);
      throw error;
    }
    console.log("✅ Sign in successful");
    return data;
  } catch (err) {
    console.error("❌ Sign in exception:", err);
    throw err;
  }
}

export async function signOut() {
  console.log("🚪 Attempting sign out");
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("❌ Sign out error:", error);
    throw error;
  }
  console.log("✅ Sign out successful");
}

export async function getCurrentUser() {
  console.log("👤 Getting current user");
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error("❌ Get user error:", error);
      throw error;
    }
    console.log("✅ Get user response:", data?.user ? "User found" : "No user");
    return data?.user || null;
  } catch (err) {
    console.error("❌ Get user exception:", err);
    throw err;
  }
}

export async function isAdmin(user: any) {
  if (!user) {
    console.log("👤 No user provided to isAdmin check");
    return false;
  }

  console.log("🔍 Checking admin status for user:", user.id);

  try {
    // First try directly checking the RLS function if available
    try {
      console.log("Trying direct RPC admin check...");
      const { data: rpcData, error: rpcError } = await supabase.rpc('check_user_admin_by_id', {
        user_id: user.id
      });

      if (!rpcError && rpcData === true) {
        console.log("✅ User confirmed as admin via RPC");
        return true;
      } else if (rpcError) {
        console.log("RPC check_user_admin_by_id failed:", rpcError);
      }
    } catch (rpcErr) {
      console.log("RPC check not available or failed:", rpcErr);
      // Continue to standard check
    }

    // Try alternative check method
    try {
      console.log("Trying alternative admin check method...");
      const { data: altData, error: altError } = await supabase.rpc('is_user_admin', {
        uid: user.id
      });

      if (!altError && altData === true) {
        console.log("✅ User confirmed as admin via alternative check");
        return true;
      } else if (altError) {
        console.log("Alternative RPC check failed:", altError);
      }
    } catch (alternativeErr) {
      console.log("Alternative check failed:", alternativeErr);
    }

    // Fetch user's role from profiles table with more verbose logging
    console.log("Querying profiles table for admin status...");
    const { data, error } = await supabase
      .from('profiles')
      .select('role, is_admin')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error("❌ Error fetching user role:", error.message, error.code);

      // If no record found, create a profile for this user
      if (error.code === 'PGRST116') {
        console.log("📝 No profile found for this user. Creating profile...");

        try {
          // Create a regular user profile
          const { error: createError } = await supabase
            .from('profiles')
            .upsert([
              {
                id: user.id,
                email: user.email,
                role: 'user',
                is_admin: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            ]);

          if (createError) {
            console.error("❌ Error creating profile:", createError);
          } else {
            console.log("✅ Created new profile for user");
          }
        } catch (createErr) {
          console.error("❌ Exception creating profile:", createErr);
        }
      }

      return false;
    }

    console.log("📊 User role data:", data);
    // Check both role column and is_admin column
    const isAdminUser = data?.role === 'admin' || data?.is_admin === true;
    console.log("🛡️ User admin status:", isAdminUser);

    return isAdminUser;
  } catch (err) {
    console.error("❌ Admin check exception:", err);
    return false;
  }
}

// Create or update a user profile in the profiles table
export async function createOrUpdateProfile(user: any, isAdmin = false) {
  if (!user || !user.id || !user.email) {
    console.error("❌ Cannot create profile: Missing user data");
    return false;
  }

  console.log(`🔧 ${isAdmin ? 'Creating admin' : 'Updating'} profile for user:`, user.id);

  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert([
        {
          id: user.id,
          email: user.email,
          role: isAdmin ? 'admin' : 'user',
          is_admin: isAdmin,
          updated_at: new Date().toISOString()
        }
      ], {
        onConflict: 'id'
      });

    if (error) {
      console.error("❌ Error creating/updating profile:", error.message);
      return false;
    }

    console.log("✅ Profile created/updated successfully");
    return true;
  } catch (err) {
    console.error("❌ Exception creating/updating profile:", err);
    return false;
  }
}

// Helper function to promote a user to admin
export async function promoteToAdmin(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: 'admin', is_admin: true })
      .eq('id', userId);

    if (error) {
      console.error("❌ Error promoting user to admin:", error);
      return false;
    }

    console.log("✅ User promoted to admin successfully");
    return true;
  } catch (err) {
    console.error("❌ Exception promoting user to admin:", err);
    return false;
  }
}
