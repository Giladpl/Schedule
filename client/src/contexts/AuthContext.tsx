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

  useEffect(() => {
    // Check for current session on mount
    const initializeAuth = async () => {
      try {
        setIsLoading(true);

        // Get current user from Supabase Auth
        const currentUser = await getCurrentUser();
        setUser(currentUser);

        // Check if the user is an admin
        if (currentUser) {
          const adminStatus = await checkIsAdmin(currentUser);
          setIsAdmin(adminStatus);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Set up listener for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null);

        // Update admin status when auth state changes
        if (session?.user) {
          const adminStatus = await checkIsAdmin(session.user);
          setIsAdmin(adminStatus);
        } else {
          setIsAdmin(false);
        }
      }
    );

    return () => {
      // Clean up the subscription
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Sign in function
  const handleSignIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      setUser(data.user);

      if (data.user) {
        const adminStatus = await checkIsAdmin(data.user);
        setIsAdmin(adminStatus);
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
