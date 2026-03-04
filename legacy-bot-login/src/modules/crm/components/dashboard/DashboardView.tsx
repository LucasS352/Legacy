import { useState } from "react";
import { Users, TrendingUp, CheckSquare, Clock, Loader2, AlertCircle } from "lucide-react";
import { useDashboardStats, useDashboardCharts } from "@/hooks/useDashboard";
import { useFunnels } from "@/hooks/useLeads";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from "recharts";

const GOLD = "#C89B3C";
const CHART_COLORS = [GOLD, "#E07A40", "#4EA8DE", "#E05A5A", "#7BC67E", "#9B8EC4"];

export function DashboardView() {
  const [activeFunnelId, setActiveFunnelId] = useState<number | null>(null);
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats();
  const { data: charts, isLoading: chartsLoading } = useDashboardCharts();
  const { data: funnels = [] } = useFunnels();

  const isLoading = statsLoading || chartsLoading;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-red-400">
        <AlertCircle className="h-8 w-8" />
        <p className="text-sm">Erro ao carregar dados do dashboard</p>
      </div>
    );
  }

  const kpiCards = [
    {
      label: "Total Leads",
      value: stats?.totalLeads ?? 0,
      icon: Users,
      accent: false,
      sub: `+${stats?.newLeadsToday ?? 0} hoje`,
    },
    {
      label: "Aprovados",
      value: stats?.approvedLeads ?? 0,
      icon: TrendingUp,
      accent: true,
      sub: `${stats?.newLeadsWeek ?? 0} esta semana`,
    },
    {
      label: "Tarefas Pendentes",
      value: stats?.pendingTasks ?? 0,
      icon: CheckSquare,
      accent: false,
      sub: `${stats?.overdueTasks ?? 0} atrasadas`,
    },
    {
      label: "Tarefas Hoje",
      value: stats?.todayTasks ?? 0,
      icon: Clock,
      accent: false,
      sub: `${stats?.activeLeads ?? 0} leads ativos`,
    },
  ];

  return (
    <div className="flex flex-col gap-5 p-4 pb-24 overflow-y-auto h-full">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border p-4 transition-all ${card.accent
                ? "border-accent/30 bg-accent/10"
                : "border-border bg-card"
              }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{card.label}</span>
              <card.icon className={`h-4 w-4 ${card.accent ? "text-accent" : "text-muted-foreground"}`} />
            </div>
            <div className={`text-3xl font-bold ${card.accent ? "text-accent" : "text-card-foreground"}`}>
              {card.value}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Leads by Funnel */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-4 text-sm font-semibold text-card-foreground">Leads por Funil</h3>
          {charts?.leadsByFunnel && charts.leadsByFunnel.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={charts.leadsByFunnel} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="funnel" tick={{ fontSize: 11, fill: "#888" }} />
                <YAxis tick={{ fontSize: 11, fill: "#888" }} />
                <Tooltip
                  contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8, fontSize: 12 }}
                  cursor={{ fill: "rgba(200,155,60,0.1)" }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {charts.leadsByFunnel.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color || CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
              Nenhum dado disponível
            </div>
          )}
        </div>

        {/* Tasks by Status */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-4 text-sm font-semibold text-card-foreground">Tarefas por Status</h3>
          {charts?.tasksByStatus && charts.tasksByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={charts.tasksByStatus}
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  dataKey="count"
                  nameKey="status"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {charts.tasksByStatus.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
              Nenhum dado disponível
            </div>
          )}
        </div>

        {/* Leads over time */}
        <div className="rounded-xl border border-border bg-card p-4 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-card-foreground">Leads (últimos 30 dias)</h3>
          {charts?.leadsOverTime && charts.leadsOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={charts.leadsOverTime} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#888" }} />
                <YAxis tick={{ fontSize: 10, fill: "#888" }} />
                <Tooltip
                  contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8, fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={GOLD}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: GOLD }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              Nenhum lead nos últimos 30 dias
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardView;
