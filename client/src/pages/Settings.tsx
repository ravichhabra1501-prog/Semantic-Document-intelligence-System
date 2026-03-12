import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Settings as SettingsIcon, Moon, Sun, Monitor, Palette, Database,
  Info, CheckCircle, BrainCircuit, Bell
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

type Theme = "light" | "dark" | "system";

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  localStorage.setItem("theme", theme);
}

function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) || "system";
  });

  const setTheme = (t: Theme) => {
    setThemeState(t);
    applyTheme(t);
  };

  useEffect(() => {
    applyTheme(theme);
  }, []);

  return { theme, setTheme };
}

interface SettingRowProps {
  label: string;
  description: string;
  children: React.ReactNode;
}

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex-1 pr-6">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

interface SectionCardProps {
  icon: any;
  title: string;
  iconColor: string;
  children: React.ReactNode;
}

function SectionCard({ icon: Icon, title, iconColor, children }: SectionCardProps) {
  return (
    <Card className="border-border/50 shadow-elevation glass-panel animate-fade-in-up">
      <CardHeader className="pb-4 border-b border-border/50 bg-secondary/30">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 py-0 divide-y divide-border/40">
        {children}
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [compactView, setCompactView] = useState(
    () => localStorage.getItem("compactView") === "true"
  );
  const [notifications, setNotifications] = useState(
    () => localStorage.getItem("notifications") !== "false"
  );

  const { data: stats } = useQuery<{ totalDocuments: number; totalEntities: number; totalTags: number }>({
    queryKey: ["/api/analytics"],
  });

  const handleCompactViewChange = (val: boolean) => {
    setCompactView(val);
    localStorage.setItem("compactView", String(val));
    toast({ title: "Preference saved", description: `Compact view ${val ? "enabled" : "disabled"}.` });
  };

  const handleNotificationsChange = (val: boolean) => {
    setNotifications(val);
    localStorage.setItem("notifications", String(val));
    toast({ title: "Preference saved", description: `Upload notifications ${val ? "enabled" : "disabled"}.` });
  };

  const SUPPORTED_TYPES = [
    { ext: ".PDF",  label: "PDF Documents",   color: "bg-red-50 text-red-600 dark:bg-red-500/10" },
    { ext: ".DOCX", label: "Word Documents",  color: "bg-blue-50 text-blue-600 dark:bg-blue-500/10" },
    { ext: ".TXT",  label: "Plain Text Files", color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10" },
    { ext: ".JPG",  label: "JPEG Images",     color: "bg-amber-50 text-amber-600 dark:bg-amber-500/10" },
    { ext: ".PNG",  label: "PNG Images",      color: "bg-violet-50 text-violet-600 dark:bg-violet-500/10" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 glass-panel border-b border-border/50 px-6 lg:px-10 py-6 shadow-elevation animate-fade-in-down">
        <div className="space-y-1">
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <SettingsIcon className="w-7 h-7" />
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              Settings
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">Customize your workspace preferences and manage your data.</p>
        </div>
      </header>

      <main className="p-6 lg:p-10 max-w-3xl mx-auto space-y-6">

        {/* Appearance */}
        <SectionCard icon={Palette} title="Appearance" iconColor="text-primary">
          <SettingRow label="Theme" description="Choose your preferred color scheme">
            <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
              {(["light", "system", "dark"] as Theme[]).map((t) => {
                const Icon = t === "light" ? Sun : t === "dark" ? Moon : Monitor;
                return (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    data-testid={`theme-${t}`}
                    className={`
                      flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-smooth capitalize
                      ${theme === t
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                      }
                    `}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t}
                  </button>
                );
              })}
            </div>
          </SettingRow>
          <SettingRow label="Compact View" description="Show smaller document cards on the dashboard">
            <Switch
              checked={compactView}
              onCheckedChange={handleCompactViewChange}
              data-testid="switch-compact-view"
            />
          </SettingRow>
        </SectionCard>

        {/* Notifications */}
        <SectionCard icon={Bell} title="Notifications" iconColor="text-amber-500">
          <SettingRow label="Upload notifications" description="Show a toast notification when documents finish processing">
            <Switch
              checked={notifications}
              onCheckedChange={handleNotificationsChange}
              data-testid="switch-notifications"
            />
          </SettingRow>
        </SectionCard>

        {/* AI Processing */}
        <SectionCard icon={BrainCircuit} title="AI Processing" iconColor="text-violet-500">
          <SettingRow label="AI Model" description="Model used for document analysis, summarization, and entity extraction">
            <Badge variant="secondary" className="font-mono text-xs">gpt-4o</Badge>
          </SettingRow>
          <SettingRow label="Text extraction limit" description="Maximum characters sent to AI per document">
            <Badge variant="secondary" className="font-mono text-xs">10,000 chars</Badge>
          </SettingRow>
          <SettingRow label="Supported file types" description="Formats accepted for upload and processing">
            <div className="flex flex-wrap gap-1.5 max-w-[200px] justify-end">
              {SUPPORTED_TYPES.map(t => (
                <span key={t.ext} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${t.color}`}>
                  {t.ext}
                </span>
              ))}
            </div>
          </SettingRow>
        </SectionCard>

        {/* Data Management */}
        <SectionCard icon={Database} title="Data Management" iconColor="text-blue-500">
          <SettingRow
            label="Workspace summary"
            description="Current totals across your document workspace"
          >
            <div className="flex items-center gap-3 text-sm">
              <div className="text-center">
                <p className="font-bold text-foreground">{stats?.totalDocuments ?? "—"}</p>
                <p className="text-[10px] text-muted-foreground">Docs</p>
              </div>
              <Separator orientation="vertical" className="h-8" />
              <div className="text-center">
                <p className="font-bold text-foreground">{stats?.totalEntities ?? "—"}</p>
                <p className="text-[10px] text-muted-foreground">Entities</p>
              </div>
              <Separator orientation="vertical" className="h-8" />
              <div className="text-center">
                <p className="font-bold text-foreground">{stats?.totalTags ?? "—"}</p>
                <p className="text-[10px] text-muted-foreground">Tags</p>
              </div>
            </div>
          </SettingRow>
        </SectionCard>

        {/* About */}
        <SectionCard icon={Info} title="About" iconColor="text-emerald-500">
          <SettingRow label="Application" description="Semantic Document Intelligence System">
            <Badge variant="secondary" className="text-xs">v1.0.0</Badge>
          </SettingRow>
          <SettingRow label="Stack" description="Powered by modern web technologies">
            <div className="flex flex-wrap gap-1 max-w-[200px] justify-end">
              {["React", "TypeScript", "Express", "PostgreSQL", "OpenAI"].map(t => (
                <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0.5 border-border/50">{t}</Badge>
              ))}
            </div>
          </SettingRow>
          <SettingRow label="AI Integration" description="Connected to OpenAI via Replit AI Integrations">
            <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              Connected
            </div>
          </SettingRow>
        </SectionCard>

      </main>
    </div>
  );
}
