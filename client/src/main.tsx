import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import Home from "./pages/home";
import Calendar from "./pages/calendar";
import NotFound from "./pages/not-found";
import { Route, Switch } from "wouter";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/calendar" component={Calendar} />
        <Route component={NotFound} />
      </Switch>
    </App>
  </QueryClientProvider>
);
