import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { mockLeads } from "@/modules/crm/data/mockLeads";
import { STAGES, FunnelType } from "@/modules/crm/types/crm";

interface Props {
  selectedFunnel: FunnelType | "todos";
}

const ConversionChart = ({ selectedFunnel }: Props) => {
  const data = useMemo(() => {
    const leads = selectedFunnel === "todos" ? mockLeads : mockLeads.filter((l) => l.funnel === selectedFunnel);
    return STAGES.map((stage) => ({
      name: stage.label,
      leads: leads.filter((l) => l.stage === stage.id).length,
    }));
  }, [selectedFunnel]);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barSize={32}>
        <XAxis dataKey="name" tick={{ fill: "hsl(30,8%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "hsl(30,8%,55%)", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: "hsl(30,6%,18%)", border: "1px solid hsl(30,6%,28%)", borderRadius: 8, color: "hsl(43,20%,88%)", fontSize: 12 }}
          cursor={{ fill: "hsl(30,6%,22%)" }}
        />
        <Bar dataKey="leads" fill="hsl(43,72%,49%)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ConversionChart;
