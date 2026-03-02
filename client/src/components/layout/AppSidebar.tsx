import { Link, useLocation } from "wouter";
import { 
  FileText, 
  LayoutDashboard, 
  Settings, 
  BrainCircuit,
  PieChart
} from "lucide-react";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarHeader
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const [location] = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "All Documents", href: "/documents", icon: FileText },
    { name: "Analytics", href: "/analytics", icon: PieChart },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <Sidebar className="border-r border-border/50 glass-panel">
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-lg shadow-primary/20 text-white">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-lg leading-tight tracking-tight text-foreground">Nexus<span className="text-primary">AI</span></span>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Workspace</span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2 px-2">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const isActive = location === item.href;
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className={`
                        mb-1 transition-all duration-200 rounded-lg px-3 py-2.5
                        ${isActive 
                          ? "bg-primary/10 text-primary font-medium shadow-sm" 
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }
                      `}
                    >
                      <Link href={item.href} className="flex items-center gap-3">
                        <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
