import { QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { Route, Switch } from "wouter";
import App from "./App";
import "./index.css";
import { queryClient } from "./lib/queryClient";
import Calendar from "./pages/calendar";
import Home from "./pages/home";
import NotFound from "./pages/not-found";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/calendar" component={Calendar} />
        <Route path="/admin" component={Calendar} />
        <Route component={NotFound} />
      </Switch>
    </App>
  </QueryClientProvider>
);
