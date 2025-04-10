// Setup admin user script
// Run this in the browser console to create an admin profile

const setupAdmin = async () => {
  try {
    // Get the Supabase client from window
    const { supabase } = window;

    if (!supabase) {
      console.error(
        "❌ Supabase client not found. Make sure you run this in the browser console on your app."
      );
      return;
    }

    // Check if user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("❌ Not authenticated. Please sign in first.");
      return;
    }

    console.log("👤 Current user:", user.id, user.email);

    // Check if profiles table exists
    const { data: tableData, error: tableError } = await supabase
      .from("profiles")
      .select("id")
      .limit(1);

    if (tableError && tableError.code === "42P01") {
      console.error("❌ Profiles table does not exist. Creating it...");

      // Create profiles table
      const { error: createError } = await supabase.rpc(
        "create_profiles_table"
      );

      if (createError) {
        console.error("❌ Failed to create profiles table:", createError);
        return;
      }

      console.log("✅ Profiles table created successfully");
    }

    // First check if the user already has a profile
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      // If this is not a "not found" error, log it
      console.error("❌ Error checking for existing profile:", profileError);
    }

    // If the profile exists and is already an admin, notify the user
    if (
      profileData &&
      (profileData.role === "admin" || profileData.is_admin === true)
    ) {
      console.log("✅ User is already an admin:", profileData);
      console.log("🔄 No changes needed, profile already has admin privileges");
      return;
    }

    // Create or update the profile for current user as admin
    const { data, error } = await supabase
      .from("profiles")
      .upsert([
        {
          id: user.id,
          email: user.email,
          role: "admin",
          is_admin: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error("❌ Failed to create admin profile:", error);

      // Fallback: try RPC function if upsert fails
      console.log(
        "🔄 Trying alternative method with create_admin_profile function..."
      );

      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "create_admin_profile",
        {
          user_id: user.id,
          user_email: user.email,
        }
      );

      if (rpcError) {
        console.error("❌ All admin creation methods failed:", rpcError);
        return;
      }

      console.log("✅ Admin profile created via RPC function:", rpcData);
    } else {
      console.log("✅ Admin profile created/updated successfully:", data);
    }

    console.log("🔄 Please refresh the page to apply changes");
  } catch (err) {
    console.error("❌ Error in setup:", err);
  }
};

// Make it available globally
window.setupAdmin = setupAdmin;

console.log(
  "✅ Admin setup script loaded. Run setupAdmin() to create an admin profile for your current user."
);
