import { QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { Route, Switch } from "wouter";
import App from "./App";
import { Toaster } from "./components/ui/toaster";
import { AuthProvider } from "./contexts/AuthContext";
import "./index.css";
import { queryClient } from "./lib/queryClient";
import { supabase } from "./lib/supabaseClient";
import AdminPage from "./pages/admin";
import Calendar from "./pages/calendar";
import Home from "./pages/home";
import NotFound from "./pages/not-found";

// Add TypeScript declaration for window
declare global {
  interface Window {
    supabase: typeof supabase;
  }
}

// Debug routing issues
console.log("🌐 App starting, pathname:", window.location.pathname);

// Make supabase available in window for admin setup script
if (import.meta.env.DEV) {
  window.supabase = supabase;
  // @ts-ignore - Dynamically import setup script
  import("./setup-admin");
  // @ts-ignore - Dynamically import debug script
  import("./debug-admin");
}

// Create a simple logger for routes
const RouteLogger = ({
  children,
  path,
}: {
  children: React.ReactNode;
  path: string;
}) => {
  console.log(`📍 Route matched: ${path}`);
  return <>{children}</>;
};

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <App>
        <Switch>
          <Route path="/">
            <RouteLogger path="/">
              <Home />
            </RouteLogger>
          </Route>
          <Route path="/calendar">
            <RouteLogger path="/calendar">
              <Calendar />
            </RouteLogger>
          </Route>
          <Route path="/admin">
            <RouteLogger path="/admin">
              <AdminPage />
            </RouteLogger>
          </Route>
          <Route>
            <RouteLogger path="*">
              <NotFound />
            </RouteLogger>
          </Route>
        </Switch>
      </App>
      <Toaster />
    </AuthProvider>
  </QueryClientProvider>
);
