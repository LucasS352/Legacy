import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { mockLeads } from "@/modules/crm/data/mockLeads";
import { FUNNELS } from "@/modules/crm/types/crm";

const COLORS = ["hsl(43,72%,49%)", "hsl(25,70%,50%)", "hsl(0,60%,50%)"];

const LeadsByFunnelChart = () => {
  const data = useMemo(() => {
    return FUNNELS.map((f, i) => ({
      name: f.label,
      leads: mockLeads.filter((l) => l.funnel === f.id).length,
      fill: COLORS[i],
    }));
  }, []);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barSize={40}>
        <XAxis dataKey="name" tick={{ fill: "hsl(30,8%,55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "hsl(30,8%,55%)", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: "hsl(30,6%,18%)", border: "1px solid hsl(30,6%,28%)", borderRadius: 8, color: "hsl(43,20%,88%)", fontSize: 12 }}
          cursor={{ fill: "hsl(30,6%,22%)" }}
        />
        <Bar dataKey="leads" radius={[6, 6, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default LeadsByFunnelChart;
