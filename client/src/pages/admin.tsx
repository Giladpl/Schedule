import { LoginForm } from "@/components/auth/LoginForm";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useLocation } from "wouter";
import Calendar from "./calendar";

export default function AdminPage() {
  const { user, isAdmin, isLoading } = useAuth();
  const [location, navigate] = useLocation();

  // Redirect authenticated non-admin users to the calendar
  useEffect(() => {
    if (!isLoading && user && !isAdmin) {
      navigate("/calendar");
    }
  }, [user, isAdmin, isLoading, navigate]);

  // If loading, show a loading state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1a73e8] mx-auto"></div>
          <p className="mt-4 text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  // If authenticated as admin, show the calendar component
  if (user && isAdmin) {
    return <Calendar />;
  }

  // Otherwise, show the login form
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
      </div>
      <Toaster />
    </div>
  );
}
