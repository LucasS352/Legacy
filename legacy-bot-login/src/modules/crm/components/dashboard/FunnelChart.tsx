import { useMemo } from "react";
import { mockLeads } from "@/modules/crm/data/mockLeads";
import { STAGES, FunnelType } from "@/modules/crm/types/crm";
import { motion } from "framer-motion";

interface Props {
  selectedFunnel: FunnelType | "todos";
}

const FunnelChart = ({ selectedFunnel }: Props) => {
  const data = useMemo(() => {
    const leads = selectedFunnel === "todos" ? mockLeads : mockLeads.filter((l) => l.funnel === selectedFunnel);
    const total = leads.length || 1;
    return STAGES.map((stage) => {
      const count = leads.filter((l) => l.stage === stage.id).length;
      return { ...stage, count, pct: Math.round((count / total) * 100) };
    });
  }, [selectedFunnel]);

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex flex-col gap-2">
      {data.map((stage, i) => (
        <motion.div
          key={stage.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          className="flex items-center gap-3"
        >
          <span className="text-xs text-muted-foreground w-28 text-right flex-shrink-0">{stage.label}</span>
          <div className="flex-1 h-8 bg-secondary/50 rounded-lg overflow-hidden relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(stage.count / maxCount) * 100}%` }}
              transition={{ delay: i * 0.08, duration: 0.5, ease: "easeOut" }}
              className="h-full gold-gradient rounded-lg flex items-center justify-end pr-2"
            >
              {stage.count > 0 && (
                <span className="text-[11px] font-semibold text-primary-foreground">{stage.count}</span>
              )}
            </motion.div>
          </div>
          <span className="text-xs text-muted-foreground w-10 flex-shrink-0">{stage.pct}%</span>
        </motion.div>
      ))}
    </div>
  );
};

export default FunnelChart;
