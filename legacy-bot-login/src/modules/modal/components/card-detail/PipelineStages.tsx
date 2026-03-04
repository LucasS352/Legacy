import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const stages = [
  "Recebido",
  "Qualificação",
  "Análise",
  "Documentação",
  "Assinatura",
  "Finalizado",
];

interface PipelineStagesProps {
  currentStage: string;
  onStageChange: (stage: string) => void;
}

const PipelineStages = ({ currentStage, onStageChange }: PipelineStagesProps) => {
  const currentIndex = stages.indexOf(currentStage);

  return (
    <div className="flex gap-1 w-full">
      {stages.map((stage, index) => {
        const isActive = index <= currentIndex;
        const isCurrent = stage === currentStage;
        return (
          <button
            key={stage}
            onClick={() => onStageChange(stage)}
            className={cn(
              "flex-1 py-2.5 px-3 text-xs font-medium transition-all duration-300 relative overflow-hidden",
              index === 0 && "rounded-l-lg",
              index === stages.length - 1 && "rounded-r-lg",
              isActive
                ? "text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-muted",
              isCurrent && "ring-1 ring-primary/50"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="pipeline-active"
                className="absolute inset-0 bg-primary"
                style={{ zIndex: 0 }}
                initial={false}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <span className="relative z-[1]">{stage}</span>
          </button>
        );
      })}
    </div>
  );
};

export default PipelineStages;
