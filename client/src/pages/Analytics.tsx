import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  FileText, Tag, Network, TrendingUp, CheckCircle, AlertCircle,
  Clock, BarChart2, PieChart as PieChartIcon, Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface AnalyticsStats {
  totalDocuments: number;
  byStatus: { status: string; count: number }[];
  byType: { type: string; count: number }[];
  byClassification: { classification: string; count: number }[];
  byEntityType: { entityType: string; count: number }[];
  recentUploads: { date: string; count: number }[];
  totalEntities: number;
  totalTags: number;
}

const TYPE_COLORS: Record<string, string> = {
  PDF:   "#6366f1",
  DOCX:  "#3b82f6",
  TXT:   "#10b981",
  Image: "#f59e0b",
  Other: "#8b5cf6",
};

const STATUS_COLORS: Record<string, string> = {
  completed:  "#10b981",
  processing: "#3b82f6",
  pending:    "#f59e0b",
  failed:     "#ef4444",
};

const ENTITY_COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];

const CHART_COLORS = [
  "#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#84cc16", "#06b6d4"
];

function StatCard({ icon: Icon, label, value, color, sub }: {
  icon: any;
  label: string;
  value: number | string;
  color: string;
  sub?: string;
}) {
  return (
    <Card className="border-border/50 shadow-elevation glass-panel animate-fade-in-up">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingCard({ height = 280 }: { height?: number }) {
  return (
    <Card className="border-border/50 shadow-elevation">
      <CardHeader className="pb-4 border-b border-border/50 bg-secondary/30">
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="p-5">
        <Skeleton className={`w-full`} style={{ height }} />
      </CardContent>
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/50 rounded-lg p-3 shadow-elevation text-sm">
      {label && <p className="font-medium text-foreground mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.fill || p.color }}>
          {p.name}: <span className="font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function Analytics() {
  const { data: stats, isLoading, isError } = useQuery<AnalyticsStats>({
    queryKey: ["/api/analytics"],
  });

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center py-24 px-12 bg-gradient-to-br from-destructive/5 to-destructive/10 rounded-3xl border border-destructive/20">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive font-semibold text-lg">Failed to load analytics</p>
          <p className="text-muted-foreground mt-2 text-sm">Please refresh the page to try again.</p>
        </div>
      </div>
    );
  }

  const completedCount = stats?.byStatus.find(s => s.status === "completed")?.count || 0;
  const successRate = stats?.totalDocuments
    ? Math.round((completedCount / stats.totalDocuments) * 100)
    : 0;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 glass-panel border-b border-border/50 px-6 lg:px-10 py-6 shadow-elevation animate-fade-in-down">
        <div className="space-y-1">
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <BarChart2 className="w-7 h-7" />
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              Analytics
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">Insights and statistics across your document workspace.</p>
        </div>
      </header>

      <main className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {isLoading ? (
            [1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)
          ) : (
            <>
              <StatCard
                icon={FileText}
                label="Total Documents"
                value={stats?.totalDocuments ?? 0}
                color="bg-blue-50 text-blue-500 dark:bg-blue-500/10"
                sub="Uploaded to workspace"
              />
              <StatCard
                icon={CheckCircle}
                label="Success Rate"
                value={`${successRate}%`}
                color="bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10"
                sub={`${completedCount} completed`}
              />
              <StatCard
                icon={Network}
                label="Entities Extracted"
                value={stats?.totalEntities ?? 0}
                color="bg-violet-50 text-violet-500 dark:bg-violet-500/10"
                sub="Named entities found"
              />
              <StatCard
                icon={Tag}
                label="Tags Created"
                value={stats?.totalTags ?? 0}
                color="bg-amber-50 text-amber-500 dark:bg-amber-500/10"
                sub="Across all documents"
              />
            </>
          )}
        </div>

        {/* Upload Activity + Document Types */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Activity - spans 2 cols */}
          <div className="lg:col-span-2">
            {isLoading ? (
              <LoadingCard height={220} />
            ) : (
              <Card className="border-border/50 shadow-elevation glass-panel animate-fade-in-up">
                <CardHeader className="pb-4 border-b border-border/50 bg-secondary/30">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Upload Activity (Last 14 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={stats?.recentUploads || []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="uploadGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={d => format(new Date(d + "T00:00:00"), "MMM d")}
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                        interval={2}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="count"
                        name="Uploads"
                        stroke="#6366f1"
                        strokeWidth={2}
                        fill="url(#uploadGradient)"
                        dot={{ fill: "#6366f1", r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Document Types Pie */}
          {isLoading ? (
            <LoadingCard height={220} />
          ) : (
            <Card className="border-border/50 shadow-elevation glass-panel animate-fade-in-up">
              <CardHeader className="pb-4 border-b border-border/50 bg-secondary/30">
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-primary" />
                  Document Types
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 flex flex-col items-center">
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={stats?.byType || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="count"
                    >
                      {stats?.byType.map((entry, i) => (
                        <Cell key={entry.type} fill={TYPE_COLORS[entry.type] || CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
                  {stats?.byType.map((entry, i) => (
                    <div key={entry.type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: TYPE_COLORS[entry.type] || CHART_COLORS[i] }} />
                      {entry.type} ({entry.count})
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Classifications Bar + Status + Entities */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Classification Bar Chart - 2 col */}
          <div className="lg:col-span-2">
            {isLoading ? (
              <LoadingCard height={240} />
            ) : (
              <Card className="border-border/50 shadow-elevation glass-panel animate-fade-in-up">
                <CardHeader className="pb-4 border-b border-border/50 bg-secondary/30">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-primary" />
                    Documents by Classification
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={stats?.byClassification || []}
                      layout="vertical"
                      margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} horizontal={false} />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="classification"
                        width={130}
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Documents" radius={[0, 4, 4, 0]} maxBarSize={20}>
                        {stats?.byClassification.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Status + Entity breakdown stacked */}
          <div className="flex flex-col gap-6">
            {isLoading ? (
              <>
                <LoadingCard height={90} />
                <LoadingCard height={130} />
              </>
            ) : (
              <>
                {/* Status Breakdown */}
                <Card className="border-border/50 shadow-elevation glass-panel animate-fade-in-up">
                  <CardHeader className="pb-3 border-b border-border/50 bg-secondary/30">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      Processing Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2">
                    {(stats?.byStatus || []).map(s => (
                      <div key={s.status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ background: STATUS_COLORS[s.status] || "#8b5cf6" }}
                          />
                          <span className="text-sm capitalize text-muted-foreground">{s.status}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs font-semibold">
                          {s.count}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Entity Type Breakdown */}
                <Card className="border-border/50 shadow-elevation glass-panel animate-fade-in-up">
                  <CardHeader className="pb-3 border-b border-border/50 bg-secondary/30">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Network className="w-4 h-4 text-violet-500" />
                      Entity Types
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2">
                    {(stats?.byEntityType || []).map((e, i) => (
                      <div key={e.entityType} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ background: ENTITY_COLORS[i % ENTITY_COLORS.length] }}
                          />
                          <span className="text-sm text-muted-foreground">{e.entityType}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs font-semibold">
                          {e.count}
                        </Badge>
                      </div>
                    ))}
                    {(!stats?.byEntityType || stats.byEntityType.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-2">No entities yet</p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
