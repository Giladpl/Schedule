import { useAuth } from "@/contexts/AuthContext";
import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";

interface ProtectedRouteProps {
  children: ReactNode;
  adminOnly?: boolean;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  adminOnly = false,
  redirectTo = "/admin",
}: ProtectedRouteProps) {
  const { user, isAdmin, isLoading } = useAuth();
  const [, navigate] = useLocation();

  console.log(
    "🔒 ProtectedRoute: user=",
    !!user,
    "isAdmin=",
    isAdmin,
    "isLoading=",
    isLoading,
    "adminOnly=",
    adminOnly
  );

  useEffect(() => {
    // Only perform auth checks after loading is complete
    if (!isLoading) {
      console.log("🔒 ProtectedRoute auth check");

      // If no user is authenticated, redirect to admin login
      if (!user) {
        console.log("🔒 No user found, redirecting to", redirectTo);
        navigate(redirectTo);
        return;
      }

      // If route requires admin access but user is not admin, redirect to calendar
      if (adminOnly && !isAdmin) {
        console.log("🔒 User is not admin, redirecting to calendar");
        navigate("/calendar");
        return;
      }

      console.log("🔒 Auth check passed, allowing access");
    }
  }, [user, isAdmin, isLoading, adminOnly, navigate, redirectTo]);

  // Show loading spinner while checking authentication, but limit to 5 seconds
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1a73e8]"></div>
      </div>
    );
  }

  // If user is authenticated and (has admin access if required), render children
  if (user && (!adminOnly || isAdmin)) {
    return <>{children}</>;
  }

  // This acts as a fallback while redirects are happening
  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-gray-500">מועבר...</p>
    </div>
  );
}
