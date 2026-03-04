import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { mockTasks } from "@/modules/crm/data/mockTasks";

const COLORS = ["hsl(43,72%,49%)", "hsl(25,70%,50%)", "hsl(140,50%,40%)"];

const TasksSummaryChart = () => {
  const data = useMemo(() => [
    { name: "Pendentes", value: mockTasks.filter((t) => t.status === "pendente").length },
    { name: "Em andamento", value: mockTasks.filter((t) => t.status === "em_andamento").length },
    { name: "Concluídas", value: mockTasks.filter((t) => t.status === "concluida").length },
  ], []);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: "hsl(30,6%,18%)", border: "1px solid hsl(30,6%,28%)", borderRadius: 8, color: "hsl(43,20%,88%)", fontSize: 12 }}
        />
        <Legend
          formatter={(value) => <span style={{ color: "hsl(30,8%,55%)", fontSize: 11 }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default TasksSummaryChart;
