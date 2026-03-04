import { useState } from "react";
import { CheckSquare, Circle, Clock, AlertCircle, Loader2, Plus } from "lucide-react";
import { useTasks, useToggleTask } from "@/hooks/useTasks";
import { Task } from "@/services/api";

type StatusFilter = "todas" | "pendente" | "em_andamento" | "concluida";
type PriorityFilter = "todas" | "alta" | "media" | "baixa";

const priorityConfig = {
  alta: { label: "Alta", class: "text-red-400 bg-red-400/10" },
  media: { label: "Média", class: "text-yellow-400 bg-yellow-400/10" },
  baixa: { label: "Baixa", class: "text-green-400 bg-green-400/10" },
};

const statusConfig = {
  pendente: { label: "Pendente", icon: Circle, class: "text-muted-foreground" },
  em_andamento: { label: "Em Andamento", icon: Clock, class: "text-blue-400" },
  concluida: { label: "Concluída", icon: CheckSquare, class: "text-green-400" },
};

export function TasksView() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todas");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("todas");

  const params: Record<string, string> = {};
  if (statusFilter !== "todas") params.status = statusFilter;
  if (priorityFilter !== "todas") params.priority = priorityFilter;

  const { data: tasks = [], isLoading, error } = useTasks(params);
  const { mutate: toggleTask } = useToggleTask();

  const isOverdue = (task: Task) => {
    if (!task.due_date || task.status === "concluida") return false;
    return new Date(task.due_date) < new Date();
  };

  const isDueToday = (task: Task) => {
    if (!task.due_date || task.status === "concluida") return false;
    const today = new Date().toISOString().split("T")[0];
    return task.due_date === today;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 p-4 border-b border-border">
        <div className="flex items-center gap-1">
          {(["todas", "pendente", "em_andamento", "concluida"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${statusFilter === s
                  ? "gold-gradient text-primary-foreground"
                  : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                }`}
            >
              {s === "todas" ? "Todas" : statusConfig[s as keyof typeof statusConfig]?.label ?? s}
            </button>
          ))}
        </div>
        <span className="text-muted-foreground">|</span>
        <div className="flex items-center gap-1">
          {(["todas", "alta", "media", "baixa"] as PriorityFilter[]).map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${priorityFilter === p
                  ? "gold-gradient text-primary-foreground"
                  : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                }`}
            >
              {p === "todas" ? "Todas" : priorityConfig[p as keyof typeof priorityConfig]?.label ?? p}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        )}

        {error && !isLoading && (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-red-400">
            <AlertCircle className="h-6 w-6" />
            <p>Erro ao carregar tarefas</p>
          </div>
        )}

        {!isLoading && !error && tasks.length === 0 && (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <CheckSquare className="h-8 w-8 opacity-30" />
            <p>Nenhuma tarefa encontrada</p>
          </div>
        )}

        {!isLoading && tasks.map((task: Task) => {
          const pCfg = priorityConfig[task.priority];
          const sCfg = statusConfig[task.status];
          const StatusIcon = sCfg?.icon || Circle;
          const overdue = isOverdue(task);
          const dueToday = isDueToday(task);

          return (
            <div
              key={task.id}
              className={`rounded-xl border bg-card p-4 transition-all ${task.status === "concluida"
                  ? "opacity-60 border-border"
                  : overdue
                    ? "border-red-500/40"
                    : dueToday
                      ? "border-yellow-500/40"
                      : "border-border hover:border-accent/30"
                }`}
            >
              <div className="flex items-start gap-3">
                {/* Toggle button */}
                <button
                  onClick={() => toggleTask(task.id)}
                  className={`mt-0.5 flex-shrink-0 transition-colors ${sCfg?.class}`}
                  title={task.status === "concluida" ? "Marcar como pendente" : "Marcar como concluída"}
                >
                  <StatusIcon className="h-5 w-5" />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-sm font-medium ${task.status === "concluida" ? "line-through text-muted-foreground" : "text-card-foreground"
                        }`}
                    >
                      {task.title}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${pCfg?.class}`}>
                      {pCfg?.label}
                    </span>
                  </div>

                  {task.description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                  )}

                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    {task.lead_name && (
                      <span className="flex items-center gap-1">
                        👤 {task.lead_name}
                      </span>
                    )}
                    {task.funnel_name && (
                      <span
                        className="rounded-full px-2 py-0.5 bg-accent/10 text-accent"
                        style={{ borderColor: task.funnel_color }}
                      >
                        {task.funnel_name}
                      </span>
                    )}
                    {task.due_date && (
                      <span className={overdue ? "text-red-400 font-medium" : dueToday ? "text-yellow-400 font-medium" : ""}>
                        📅 {overdue ? "Atrasada: " : dueToday ? "Hoje: " : ""}{new Date(task.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TasksView;
