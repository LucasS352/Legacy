import { Lead } from "@/modules/crm/types/crm";

export const mockLeads: Lead[] = [
  { id: "1", name: "Maria Silva", phone: "(11) 99876-5432", origin: "whatsapp", createdAt: "2026-02-13", funnel: "trabalhista", stage: "recebido", notes: "Demissão sem justa causa" },
  { id: "2", name: "João Santos", phone: "(21) 98765-4321", origin: "whatsapp", createdAt: "2026-02-12", funnel: "trabalhista", stage: "qualificacao", notes: "Horas extras não pagas" },
  { id: "3", name: "Ana Oliveira", phone: "(31) 97654-3210", origin: "whatsapp", createdAt: "2026-02-11", funnel: "trabalhista", stage: "analise" },
  { id: "4", name: "Carlos Souza", phone: "(41) 96543-2109", origin: "manual", createdAt: "2026-02-10", funnel: "trabalhista", stage: "documentacao" },
  { id: "5", name: "Fernanda Lima", phone: "(51) 95432-1098", origin: "whatsapp", createdAt: "2026-02-09", funnel: "trabalhista", stage: "assinatura" },
  { id: "6", name: "Roberto Costa", phone: "(61) 94321-0987", origin: "whatsapp", createdAt: "2026-02-08", funnel: "trabalhista", stage: "recebido" },
  { id: "7", name: "Luciana Pereira", phone: "(71) 93210-9876", origin: "whatsapp", createdAt: "2026-02-13", funnel: "negativado", stage: "recebido", notes: "Negativação indevida" },
  { id: "8", name: "Pedro Almeida", phone: "(81) 92109-8765", origin: "whatsapp", createdAt: "2026-02-12", funnel: "negativado", stage: "qualificacao" },
  { id: "9", name: "Juliana Ramos", phone: "(91) 91098-7654", origin: "manual", createdAt: "2026-02-11", funnel: "negativado", stage: "analise" },
  { id: "10", name: "Marcos Ferreira", phone: "(11) 90987-6543", origin: "whatsapp", createdAt: "2026-02-13", funnel: "golpe", stage: "recebido", notes: "Vítima de golpe PIX" },
  { id: "11", name: "Tatiana Dias", phone: "(21) 89876-5432", origin: "whatsapp", createdAt: "2026-02-12", funnel: "golpe", stage: "qualificacao" },
  { id: "12", name: "Bruno Martins", phone: "(31) 88765-4321", origin: "whatsapp", createdAt: "2026-02-10", funnel: "golpe", stage: "documentacao" },
];
