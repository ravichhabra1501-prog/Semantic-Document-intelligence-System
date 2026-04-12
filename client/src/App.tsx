import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch } from "wouter";
import { queryClient } from "./lib/queryClient";

import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import { AppSidebar } from "@/components/layout/AppSidebar";
import Analytics from "@/pages/Analytics";
import AuthPage from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import DocumentDetail from "@/pages/DocumentDetail";
import Settings from "@/pages/Settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/documents" component={Dashboard} />
      <Route path="/documents/:id" component={DocumentDetail} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

function AppShell() {
  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;
  const { isLoading, user } = useAuth();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {isLoading ? (
          <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
            <div className="pointer-events-none absolute inset-0 signal-grid opacity-[0.16]" />
            <div className="mesh-panel panel-outline rounded-[2rem] px-8 py-10 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Workspace
              </p>
              <p className="mt-3 text-lg font-semibold text-foreground">
                Loading your workspace...
              </p>
            </div>
          </div>
        ) : user ? (
          <SidebarProvider style={style}>
            <div className="relative flex h-screen w-full overflow-hidden">
              <div className="pointer-events-none absolute inset-0 -z-10 signal-grid opacity-[0.16]" />
              <div className="pointer-events-none absolute -left-24 top-20 -z-10 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
              <div className="pointer-events-none absolute right-[-4rem] top-[-3rem] -z-10 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl" />
              <div className="pointer-events-none absolute bottom-[-6rem] left-[32%] -z-10 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />
              <AppSidebar />
              <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
                <Router />
              </div>
            </div>
          </SidebarProvider>
        ) : (
          <AuthPage />
        )}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
