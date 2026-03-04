import { CheckCircle2, Circle, Clock, Plus, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  priority: "Alta" | "Média" | "Baixa";
  status: "pendente" | "em_andamento" | "concluida";
  dueDate: string;
}

interface TasksSectionProps {
  tasks: Task[];
}

const priorityStyles: Record<string, string> = {
  Alta: "text-destructive",
  Média: "text-primary",
  Baixa: "text-muted-foreground",
};

const TasksSection = ({ tasks }: TasksSectionProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">
          Tarefas
        </h3>
        <button className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
          <Plus className="w-3.5 h-3.5" />
          Nova Tarefa
        </button>
      </div>

      <div className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-start gap-3 p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
          >
            <button className="mt-0.5 shrink-0">
              {task.status === "concluida" ? (
                <CheckCircle2 className="w-4.5 h-4.5 text-success" />
              ) : task.status === "em_andamento" ? (
                <Clock className="w-4.5 h-4.5 text-primary" />
              ) : (
                <Circle className="w-4.5 h-4.5 text-muted-foreground" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium",
                task.status === "concluida" && "line-through text-muted-foreground"
              )}>
                {task.title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn("text-[10px] font-medium", priorityStyles[task.priority])}>
                  {task.priority}
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="w-3 h-3" />
                  {task.dueDate}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TasksSection;
