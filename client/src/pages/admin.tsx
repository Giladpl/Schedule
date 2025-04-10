import { LoginForm } from "@/components/auth/LoginForm";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { createOrUpdateProfile } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Calendar from "./calendar";

// Declare setupAdmin function type
declare global {
  interface Window {
    setupAdmin?: () => Promise<void>;
  }
}

// Add test login function
const useTestLogin = () => {
  const { signIn } = useAuth();

  const loginAsAdmin = async () => {
    try {
      await signIn("admin@example.com", "admin123");
      return true;
    } catch (error) {
      console.error("Test login failed:", error);
      return false;
    }
  };

  return { loginAsAdmin };
};

export default function AdminPage() {
  console.log("⭐ Admin page component rendering");

  const { user, isAdmin, isLoading, checkAdminStatus } = useAuth();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [loadingTime, setLoadingTime] = useState(0);
  const [hasAttemptedLogin, setHasAttemptedLogin] = useState(false);
  const [processingAdminSetup, setProcessingAdminSetup] = useState(false);
  const { loginAsAdmin } = useTestLogin();

  // Track loading time to detect potential issues
  useEffect(() => {
    let timer: number | undefined;

    if (isLoading) {
      const startTime = Date.now();
      timer = window.setInterval(() => {
        setLoadingTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      setLoadingTime(0);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isLoading]);

  // Effect to handle authentication state changes - but only after initial load
  useEffect(() => {
    // Skip all checks if still in initial loading
    if (isLoading) {
      console.log("Still loading, skipping auth checks");
      return;
    }

    const handleAuthState = async () => {
      console.log(
        "Auth state handler running. User:",
        !!user,
        "isAdmin:",
        isAdmin
      );

      // Only handle redirects for users who have explicitly logged in
      if (user && hasAttemptedLogin) {
        // If they're not an admin, redirect to calendar after a delay
        if (!isAdmin) {
          // Double-check admin status to be sure
          console.log("Checking admin status again...");
          const adminStatus = await checkAdminStatus();
          console.log("Admin status rechecked:", adminStatus);

          if (!adminStatus) {
            console.log("User is not an admin, redirecting...");
            toast({
              title: "הרשאות לא מספיקות",
              description: "אין לך גישה לאזור הניהול. הנך מועבר ללוח השנה.",
              variant: "destructive",
            });

            // Short delay before redirecting to ensure toast is visible
            setTimeout(() => {
              navigate("/calendar");
            }, 1500);
          }
        }
      }
    };

    handleAuthState();
  }, [
    user,
    isAdmin,
    isLoading,
    navigate,
    toast,
    checkAdminStatus,
    hasAttemptedLogin,
  ]);

  // Update the login status whenever user successfully logs in
  useEffect(() => {
    if (user && !hasAttemptedLogin) {
      console.log("User detected, marking as attempted login");
      setHasAttemptedLogin(true);
    }
  }, [user, hasAttemptedLogin]);

  // Redirect to calendar page button
  const handleRedirectToCalendar = () => {
    navigate("/calendar");
  };

  // Retry login by refreshing the page
  const handleRetry = () => {
    window.location.reload();
  };

  // Setup admin access
  const handleSetupAdmin = async () => {
    if (!user) {
      toast({
        title: "שגיאה",
        description: "עליך להתחבר תחילה כדי להפוך למנהל מערכת",
        variant: "destructive",
      });
      return;
    }

    setProcessingAdminSetup(true);

    try {
      // Update the user's profile to be an admin
      const success = await createOrUpdateProfile(user, true);

      if (success) {
        toast({
          title: "הפעולה הצליחה",
          description: "הרשאות מנהל מערכת הוענקו למשתמש זה",
        });

        // Refresh the admin status
        await checkAdminStatus();

        // Short pause before reload
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן להעניק הרשאות מנהל מערכת",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error setting up admin:", error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בתהליך הגדרת הרשאות מנהל מערכת",
        variant: "destructive",
      });
    } finally {
      setProcessingAdminSetup(false);
    }
  };

  // Handle quick test login
  const handleTestLogin = async () => {
    setIsSubmitting(true);
    const success = await loginAsAdmin();
    if (success) {
      toast({
        title: "התחברות ניסיונית בוצעה בהצלחה",
        description: "התחברת כמשתמש מנהל לצורך בדיקה",
      });
    } else {
      toast({
        title: "שגיאה",
        description: "התחברות הניסיון נכשלה",
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Show loading state, but with a faster timeout (5 seconds max)
  if (isLoading && loadingTime < 5) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1a73e8] mx-auto"></div>
          <p className="mt-4 text-gray-600">
            טוען... {loadingTime > 2 ? `(${loadingTime} שניות)` : ""}
          </p>
        </div>
      </div>
    );
  }

  // If authenticated as admin, show the calendar component
  if (user && isAdmin) {
    console.log("User is admin, showing admin calendar");
    return <Calendar />;
  }

  // For all other cases (not admin, loading taking too long, etc.), show the login form
  console.log("Showing login form");
  return (
    <div className="h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[#1a73e8]">
            ניהול לוח פגישות
          </h1>
          <p className="text-gray-600 mt-2">התחבר כדי לגשת לאזור הניהול</p>
        </div>
        <LoginForm />

        <div className="mt-4 text-center space-y-2">
          <Button
            variant="outline"
            onClick={handleRedirectToCalendar}
            className="mt-4 w-full"
          >
            חזור ללוח השנה
          </Button>

          {user && (
            <Button
              variant="ghost"
              onClick={handleSetupAdmin}
              className="text-sm text-gray-500 mt-4"
              size="sm"
              disabled={processingAdminSetup}
            >
              {processingAdminSetup
                ? "מגדיר הרשאות..."
                : "הגדר משתמש זה כמנהל מערכת"}
            </Button>
          )}

          {user && (
            <Button
              variant="ghost"
              onClick={async () => {
                try {
                  console.log("Forcing admin status refresh");
                  const status = await checkAdminStatus();
                  console.log("Current admin status:", status);
                  toast({
                    title: "בדיקת סטטוס",
                    description: `סטטוס מנהל: ${
                      status ? "כן" : "לא"
                    }. מרענן דף...`,
                  });
                  // Force redirect to admin page
                  setTimeout(() => {
                    window.location.href = "/admin";
                  }, 1500);
                } catch (error) {
                  console.error("Status check error:", error);
                  toast({
                    title: "שגיאה",
                    description: "שגיאה בבדיקת סטטוס מנהל",
                    variant: "destructive",
                  });
                }
              }}
              className="text-sm bg-yellow-100 text-yellow-800 mt-2 w-full"
              size="sm"
            >
              אבחון: בדוק סטטוס מנהל ורענן
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={handleTestLogin}
            className="text-sm text-gray-500 mt-2"
            size="sm"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "מתחבר..."
              : "התחבר בחשבון לדוגמה (admin@example.com)"}
          </Button>

          {loadingTime > 5 && (
            <Button
              variant="ghost"
              onClick={handleRetry}
              className="text-sm text-gray-500 mt-2"
              size="sm"
            >
              התחברות נמשכת זמן רב - נסה שוב
            </Button>
          )}
        </div>
      </div>
      <Toaster />
    </div>
  );
}
