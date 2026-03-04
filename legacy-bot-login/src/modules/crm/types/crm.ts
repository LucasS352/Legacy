export interface Lead {
  id: string;
  name: string;
  phone: string;
  origin: "whatsapp" | "manual";
  createdAt: string;
  funnel: string;
  stage: string;
  notes?: string;
}

export type FunnelType = "trabalhista" | "negativado" | "golpe";

export const FUNNELS: { id: FunnelType; label: string; color: string }[] = [
  { id: "trabalhista", label: "Trabalhista", color: "hsl(43 72% 49%)" },
  { id: "negativado", label: "Negativado", color: "hsl(20 80% 55%)" },
  { id: "golpe", label: "Golpe", color: "hsl(0 65% 55%)" },
];

export const STAGES = [
  { id: "recebido", label: "Recebido" },
  { id: "qualificacao", label: "Qualificação" },
  { id: "analise", label: "Análise" },
  { id: "documentacao", label: "Documentação" },
  { id: "assinatura", label: "Assinatura" },
  { id: "finalizado", label: "Finalizado" },
];
