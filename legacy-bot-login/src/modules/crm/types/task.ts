export interface Task {
  id: string;
  title: string;
  description?: string;
  leadId: string;
  leadName: string;
  funnel: string;
  priority: "alta" | "media" | "baixa";
  status: "pendente" | "em_andamento" | "concluida";
  dueDate: string;
  createdAt: string;
  category: "ligacao" | "documento" | "reuniao" | "prazo" | "outro";
}
