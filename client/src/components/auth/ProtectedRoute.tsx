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

  useEffect(() => {
    if (!isLoading) {
      // If no user is authenticated, redirect to admin login
      if (!user) {
        navigate(redirectTo);
      }
      // If route requires admin access but user is not admin, redirect
      else if (adminOnly && !isAdmin) {
        navigate("/calendar");
      }
    }
  }, [user, isAdmin, isLoading, adminOnly, navigate, redirectTo]);

  // Show loading spinner while checking authentication
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

  // This will briefly show before redirection happens
  return null;
}
