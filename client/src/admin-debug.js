// Admin Authentication Debug Tool
// Copy and paste this entire function into your browser console

async function debugAdminAuth() {
  console.log(
    "%c🔍 ADMIN AUTH DEBUGGING TOOL 🔍",
    "font-size: 16px; font-weight: bold; color: blue;"
  );

  // Step 1: Check if the supabase client is available
  if (!window.supabase) {
    console.error(
      "❌ Supabase client not found in window object. Make sure you're on a page with the client loaded."
    );
    return;
  }

  // Step 2: Get current auth state
  console.log("👤 Checking current authentication...");
  const { data: authData, error: authError } =
    await window.supabase.auth.getSession();

  if (authError) {
    console.error("❌ Auth error:", authError);
    return;
  }

  if (!authData?.session?.user) {
    console.error("❌ No authenticated user found. Please login first.");
    return;
  }

  const user = authData.session.user;
  console.log("✅ Authenticated as:", user.email);
  console.log("🆔 User ID:", user.id);

  // Step 3: Check JWT token claims
  console.log("\n📝 TOKEN INFO:");
  const token = authData.session.access_token;
  const tokenParts = token.split(".");
  if (tokenParts.length !== 3) {
    console.error("❌ Invalid JWT token format");
  } else {
    try {
      const payload = JSON.parse(atob(tokenParts[1]));
      console.log("Token payload:", payload);
      console.log("Token role:", payload.role);
      console.log(
        "Token expiry:",
        new Date(payload.exp * 1000).toLocaleString()
      );

      if (payload.exp * 1000 < Date.now()) {
        console.error("❌ TOKEN EXPIRED - Try logging out and back in");
      }
    } catch (e) {
      console.error("❌ Error parsing token:", e);
    }
  }

  // Step 4: Check direct RPC function
  console.log("\n🔍 TESTING RPC FUNCTIONS:");
  try {
    console.log("Testing check_user_admin_by_id...");
    const { data: checkData, error: checkError } = await window.supabase.rpc(
      "check_user_admin_by_id",
      {
        user_id: user.id,
      }
    );

    if (checkError) {
      console.error("❌ RPC check_user_admin_by_id error:", checkError);
    } else {
      console.log(`✅ check_user_admin_by_id result: ${checkData}`);
    }
  } catch (e) {
    console.error("❌ Exception in check_user_admin_by_id:", e);
  }

  try {
    console.log("Testing is_user_admin...");
    const { data: isAdminData, error: isAdminError } =
      await window.supabase.rpc("is_user_admin", {
        uid: user.id,
      });

    if (isAdminError) {
      console.error("❌ RPC is_user_admin error:", isAdminError);
    } else {
      console.log(`✅ is_user_admin result: ${isAdminData}`);
    }
  } catch (e) {
    console.error("❌ Exception in is_user_admin:", e);
  }

  // Step 5: Check profile directly
  console.log("\n🔍 CHECKING PROFILE DATA:");
  try {
    const { data: profileData, error: profileError } = await window.supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("❌ Error fetching profile:", profileError);
    } else {
      console.log("✅ Profile found:", profileData);
      console.log(
        `Role: ${profileData.role}, is_admin: ${profileData.is_admin}`
      );

      if (profileData.role === "admin" || profileData.is_admin === true) {
        console.log(
          "%c✅ USER SHOULD BE ADMIN - Check permissions/policies",
          "color: green; font-weight: bold"
        );
      } else {
        console.log(
          "%c❌ USER IS NOT ADMIN IN DATABASE",
          "color: red; font-weight: bold"
        );
      }
    }
  } catch (e) {
    console.error("❌ Exception fetching profile:", e);
  }

  // Step 6: Check RLS policies
  console.log("\n🔍 CHECKING PERMISSIONS:");
  try {
    // Try to read all profiles as a test
    const { data: allProfiles, error: allProfilesError } = await window.supabase
      .from("profiles")
      .select("id, email, role, is_admin")
      .limit(5);

    if (allProfilesError) {
      console.error("❌ Error accessing profiles table:", allProfilesError);
      console.log(
        "This suggests an RLS policy issue - you don't have read access"
      );
    } else {
      console.log(`✅ Successfully read ${allProfiles.length} profiles`);
      if (allProfiles.length > 1) {
        console.log(
          "You have admin-level read permissions to the profiles table"
        );
      }
    }
  } catch (e) {
    console.error("❌ Exception checking permissions:", e);
  }

  // Step 7: Clean up session and try reauth if needed
  console.log("\n🔄 TROUBLESHOOTING STEPS:");
  console.log("1. Clear browser cache/cookies and try again");
  console.log("2. Logout and log back in");
  console.log("3. Try refreshing your token:");

  // Add refresh option
  console.log("\nTo refresh your token, run this command: refreshAuthToken()");
}

async function refreshAuthToken() {
  if (!window.supabase) {
    console.error("❌ Supabase client not found");
    return;
  }

  try {
    const { data, error } = await window.supabase.auth.refreshSession();
    if (error) {
      console.error("❌ Token refresh failed:", error);
    } else {
      console.log("✅ Token refreshed successfully");
      console.log("New session:", data.session);
    }
  } catch (e) {
    console.error("❌ Exception refreshing token:", e);
  }
}

// Execute the debug function
debugAdminAuth();
