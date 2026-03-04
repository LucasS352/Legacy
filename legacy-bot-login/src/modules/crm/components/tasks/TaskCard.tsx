import { Task } from "@/modules/crm/types/task";
import { motion } from "framer-motion";
import {
  Phone,
  FileText,
  Users,
  Clock,
  MoreHorizontal,
  CheckCircle2,
  Circle,
  User,
  AlertTriangle,
} from "lucide-react";

interface TaskCardProps {
  task: Task;
  index: number;
  onToggle: (id: string) => void;
}

const categoryIcons: Record<Task["category"], typeof Phone> = {
  ligacao: Phone,
  documento: FileText,
  reuniao: Users,
  prazo: Clock,
  outro: MoreHorizontal,
};

const categoryLabels: Record<Task["category"], string> = {
  ligacao: "Ligação",
  documento: "Documento",
  reuniao: "Reunião",
  prazo: "Prazo",
  outro: "Outro",
};

const priorityConfig: Record<Task["priority"], { label: string; className: string }> = {
  alta: { label: "Alta", className: "bg-destructive/15 text-destructive" },
  media: { label: "Média", className: "bg-primary/15 text-primary" },
  baixa: { label: "Baixa", className: "bg-muted text-muted-foreground" },
};

const funnelLabels: Record<string, string> = {
  trabalhista: "Trabalhista",
  negativado: "Negativado",
  golpe: "Golpe",
};

const TaskCard = ({ task, index, onToggle }: TaskCardProps) => {
  const CategoryIcon = categoryIcons[task.category];
  const isDone = task.status === "concluida";
  const isOverdue = !isDone && task.dueDate < "2026-02-14";
  const isToday = task.dueDate === "2026-02-14";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      className={`glass-card rounded-xl p-4 transition-all duration-200 group ${
        isDone ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Toggle */}
        <button
          onClick={() => onToggle(task.id)}
          className="mt-0.5 flex-shrink-0 transition-colors"
        >
          {isDone ? (
            <CheckCircle2 className="w-5 h-5 text-primary" />
          ) : (
            <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className={`text-sm font-medium leading-tight ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {task.title}
            </p>
            <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 flex-shrink-0 ${priorityConfig[task.priority].className}`}>
              {priorityConfig[task.priority].label}
            </span>
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{task.description}</p>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            {/* Lead */}
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <User className="w-3 h-3" />
              {task.leadName}
            </span>

            {/* Funnel */}
            <span className="text-[10px] bg-secondary text-secondary-foreground rounded-full px-2 py-0.5">
              {funnelLabels[task.funnel] || task.funnel}
            </span>

            {/* Category */}
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <CategoryIcon className="w-3 h-3" />
              {categoryLabels[task.category]}
            </span>

            {/* Due date */}
            <span className={`flex items-center gap-1 text-[11px] ${
              isOverdue ? "text-destructive" : isToday ? "text-primary" : "text-muted-foreground"
            }`}>
              {isOverdue && <AlertTriangle className="w-3 h-3" />}
              <Clock className="w-3 h-3" />
              {isToday ? "Hoje" : task.dueDate}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TaskCard;
