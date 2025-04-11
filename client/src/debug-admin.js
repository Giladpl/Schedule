// Admin Authentication Debug Script
// Run this in your browser console to diagnose admin recognition issues

const debugAdmin = async () => {
  try {
    // Get the Supabase client
    const { supabase } = window;
    if (!supabase) {
      console.error(
        "❌ Supabase client not found - make sure you run this on your app"
      );
      return;
    }

    console.log("🔍 Starting admin debug process...");

    // Step 1: Check current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("❌ Not authenticated:", userError || "No user found");
      return;
    }

    console.log("✅ Current user:", user.id, user.email);

    // Step 2: Direct database query for profile
    console.log("🔍 Checking profiles table directly...");
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("❌ Error fetching profile:", profileError);
    } else {
      console.log("✅ Profile found:", profile);
      console.log(
        "📊 Admin status via database:",
        profile.role === "admin" || profile.is_admin === true
      );
    }

    // Step 3: Check via RPC functions
    try {
      console.log("🔍 Testing RPC admin check function...");
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "check_user_admin",
        {
          user_id: user.id,
        }
      );

      if (rpcError) {
        console.error("❌ RPC check_user_admin failed:", rpcError);
      } else {
        console.log("✅ RPC check_user_admin result:", rpcData);
      }
    } catch (rpcErr) {
      console.error("❌ Exception in RPC call:", rpcErr);
    }

    // Step 4: Check via alternative function
    try {
      console.log("🔍 Testing alternative RPC admin check function...");
      const { data: altData, error: altError } = await supabase.rpc(
        "is_user_admin",
        {
          uid: user.id,
        }
      );

      if (altError) {
        console.error("❌ RPC is_user_admin failed:", altError);
      } else {
        console.log("✅ RPC is_user_admin result:", altData);
      }
    } catch (altErr) {
      console.error("❌ Exception in alternative RPC call:", altErr);
    }

    // Step 5: Try manual update of admin status
    console.log("🔧 Attempting to fix admin status directly...");
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        role: "admin",
        is_admin: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("❌ Failed to update admin status:", updateError);
    } else {
      console.log("✅ Admin status updated directly in database");
      console.log("🔄 You should refresh the page to see if the fix worked");
    }

    // Step 6: Check for missing admin object in localStorage
    const localStorageCheck = () => {
      try {
        const supabaseCookies = document.cookie
          .split(";")
          .map((cookie) => cookie.trim())
          .filter((cookie) => cookie.startsWith("sb-"));

        console.log("🍪 Supabase cookies:", supabaseCookies);

        // Check localStorage
        const storageKeys = Object.keys(localStorage).filter((key) =>
          key.startsWith("sb-")
        );

        if (storageKeys.length) {
          console.log("📦 Found Supabase storage keys:", storageKeys);

          for (const key of storageKeys) {
            try {
              const data = JSON.parse(localStorage.getItem(key) || "{}");
              console.log(`📊 Storage data for ${key}:`, data);
            } catch (e) {
              console.log(`❌ Error parsing storage for ${key}:`, e);
            }
          }
        } else {
          console.log("❌ No Supabase storage keys found");
        }
      } catch (e) {
        console.error("Error checking localStorage:", e);
      }
    };

    localStorageCheck();
  } catch (err) {
    console.error("❌ Debug process error:", err);
  }
};

// Make available globally
window.debugAdmin = debugAdmin;

console.log(
  "✅ Admin debug script loaded. Run debugAdmin() in console to diagnose issues."
);
