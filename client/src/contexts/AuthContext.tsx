import {
  isAdmin as checkIsAdmin,
  getCurrentUser,
  supabase,
} from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkAdminStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Function to check if a user is an admin
  const checkUserAdminStatus = async (
    currentUser: User | null,
    force = false
  ) => {
    if (!currentUser) {
      console.log("No user to check admin status for");
      setIsAdmin(false);
      return false;
    }

    // Skip admin check during initial load to prevent premature redirects
    if (!isInitialized && !force) {
      console.log("🔍 Skipping initial admin check until login confirmed");
      return false;
    }

    console.log("🔍 Checking if user is admin in AuthContext", currentUser.id);
    try {
      const adminStatus = await checkIsAdmin(currentUser);
      console.log("🛡️ Admin status in AuthContext:", adminStatus);
      setIsAdmin(adminStatus);
      return adminStatus;
    } catch (adminError) {
      console.error(
        "❌ Error checking admin status in AuthContext:",
        adminError
      );
      // If admin check fails, don't set as admin
      setIsAdmin(false);
      return false;
    }
  };

  // Exposed function to manually check admin status
  const checkAdminStatus = async () => {
    if (!user) return false;
    return await checkUserAdminStatus(user, true);
  };

  useEffect(() => {
    // Check for current session on mount
    const initializeAuth = async () => {
      try {
        console.log("⏳ Initializing auth...");
        // Set to loading state
        setIsLoading(true);

        // Set a safety timeout to prevent infinite loading
        const safetyTimeout = setTimeout(() => {
          console.log("⚠️ Safety timeout triggered - resetting loading state");
          setIsLoading(false);
          setIsInitialized(true);
        }, 4000); // Reduced to 4 seconds for faster UX

        // Get current user from Supabase Auth
        console.log("📡 Fetching current user from Supabase");
        try {
          const currentUser = await getCurrentUser();
          console.log("👤 Current user:", currentUser?.id || "No user found");
          setUser(currentUser);

          // Check admin status if user exists
          if (currentUser) {
            try {
              await checkUserAdminStatus(currentUser, false);
            } catch (adminError) {
              console.error("❌ Admin check failed:", adminError);
              // Continue even if admin check fails
            }
          }
        } catch (userError) {
          console.error("❌ Error getting current user:", userError);
          // Continue even if getting user fails
        }

        // Clear the safety timeout since we completed normally
        clearTimeout(safetyTimeout);
      } catch (error) {
        console.error("❌ Error initializing auth:", error);
      } finally {
        console.log("✅ Auth initialization complete");
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    initializeAuth();

    // Set up listener for auth state changes
    console.log("📡 Setting up auth state change listener");
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🔄 Auth state changed:", event);
        console.log("📝 Session:", session?.user?.id);

        const newUser = session?.user || null;
        setUser(newUser);

        // Update admin status when auth state changes
        if (newUser) {
          await checkUserAdminStatus(newUser, true);
        } else {
          setIsAdmin(false);
        }
      }
    );

    return () => {
      // Clean up the subscription
      console.log("🧹 Cleaning up auth listener");
      authListener.subscription.unsubscribe();
    };
  }, [isInitialized]);

  // Sign in function
  const handleSignIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log("🔑 Attempting sign in for:", email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("❌ Sign in error:", error);
        throw error;
      }

      console.log("✅ Sign in successful, user:", data.user?.id);
      setUser(data.user);

      if (data.user) {
        // Force admin check after explicit sign in
        const adminStatus = await checkUserAdminStatus(data.user, true);
        console.log("🛡️ Admin status after sign in:", adminStatus);
      }
    } catch (error) {
      console.error("Error signing in:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out function
  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsAdmin(false);
      console.log("✅ Sign out successful");
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isLoading,
    isAdmin,
    signIn: handleSignIn,
    signOut: handleSignOut,
    checkAdminStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
