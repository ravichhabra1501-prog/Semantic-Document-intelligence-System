import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { toast } from "@/hooks/use-toast";
import { signOutFromEntra } from "@/lib/entra";
import {
    Activity,
    ChevronRight,
    FileText,
    LayoutDashboard,
    LoaderCircle,
    LogOut,
    PieChart,
    Settings,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const navigation = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      caption: "Overview",
    },
    {
      name: "All Documents",
      href: "/documents",
      icon: FileText,
      caption: "Library",
    },
    {
      name: "Analytics",
      href: "/analytics",
      icon: PieChart,
      caption: "Signals",
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      caption: "Preferences",
    },
  ];

  const handleSignOut = async () => {
    setIsSigningOut(true);

    try {
      await signOutFromEntra();
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    } catch (error) {
      toast({
        title: "Unable to sign out",
        description:
          error instanceof Error
            ? error.message
            : "Sign-out failed unexpectedly.",
        variant: "destructive",
      });
    }

    setIsSigningOut(false);
  };

  return (
    <Sidebar className="border-r border-white/10 bg-[linear-gradient(180deg,rgba(10,15,26,0.96),rgba(7,11,19,0.92))] backdrop-blur-xl">
      <SidebarHeader className="p-5 pb-3">
        <div className="mesh-panel panel-outline rounded-[1.75rem] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 shadow-lg shadow-primary/20">
              <img
                src="/logo.svg"
                alt="NexusAI logo"
                className="h-8 w-8 drop-shadow-sm"
              />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-display text-lg font-semibold tracking-tight text-foreground">
                Doc <span className="text-primary">Intel</span>
              </span>
              <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                NexusAI hub
              </span>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              <span>System Pulse</span>
              <Activity className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="mt-2 text-sm leading-6 text-foreground/85">
              A live room for extraction, workflows, and document intelligence.
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 pb-4">
        <SidebarGroup>
          <SidebarGroupLabel className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/70">
            Control Deck
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {navigation.map((item) => {
                const isActive = location === item.href;

                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={`group relative min-h-[72px] overflow-hidden rounded-2xl px-3 py-3 border transition-all duration-300 ${
                        isActive
                          ? "border-primary/35 bg-primary/12 text-foreground shadow-[0_12px_30px_rgba(16,185,129,0.12)]"
                          : "border-white/5 bg-white/[0.02] text-muted-foreground hover:border-white/10 hover:bg-white/[0.05] hover:text-foreground"
                      }`}
                    >
                      <Link
                        href={item.href}
                        className="flex items-center gap-3"
                      >
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                            isActive
                              ? "border-primary/40 bg-primary/12 text-primary"
                              : "border-white/10 bg-black/10 text-muted-foreground group-hover:text-foreground"
                          }`}
                        >
                          <item.icon className="h-4.5 w-4.5" />
                        </div>
                        <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                          <div className="min-w-0 leading-tight">
                            <span className="block truncate text-[1.05rem] font-semibold">
                              {item.name}
                            </span>
                            <span className="block truncate pt-1 text-[11px] text-muted-foreground/80">
                              {item.caption}
                            </span>
                          </div>
                          <ChevronRight
                            className={`h-4 w-4 transition-transform ${
                              isActive
                                ? "text-primary"
                                : "text-muted-foreground/60 group-hover:translate-x-0.5"
                            }`}
                          />
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-4 px-2">
          <div className="rounded-[1.5rem] border border-amber-400/15 bg-[linear-gradient(135deg,rgba(245,158,11,0.12),rgba(20,24,38,0.4))] p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-amber-200/70">
              Workspace Mode
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground/85">
              Built for reading dense documents fast, with AI workflows surfaced
              beside the raw text.
            </p>
          </div>
        </div>
      </SidebarContent>

      <SidebarFooter className="border-t border-white/10 p-4">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Signed in as
          </p>
          <p className="mt-2 truncate text-sm font-medium text-foreground">
            {user?.email ?? "Unknown user"}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full rounded-xl border-white/10 bg-black/10 text-foreground hover:bg-white/[0.05]"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Signing out...
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4" />
                Sign Out
              </>
            )}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
