import { useState, useMemo } from "react";
import { Search, Loader2, Plus, AlertCircle } from "lucide-react";
import { FunnelTabs } from "./FunnelTabs";
import KanbanColumn from "./KanbanColumn";
import { STAGES } from "../../types/crm";
import { useLeads, useFunnels } from "@/hooks/useLeads";
import { Lead } from "@/services/api";
import NewLeadModal from "@/components/modals/NewLeadModal";

export function KanbanBoard() {
  const [activeFunnelId, setActiveFunnelId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [showNewLead, setShowNewLead] = useState(false);

  const { data: funnels = [], isLoading: funnelsLoading } = useFunnels();

  // Set first funnel as default when funnels load
  const currentFunnelId = activeFunnelId ?? funnels[0]?.id ?? null;

  const { data: leads = [], isLoading: leadsLoading, error } = useLeads(
    currentFunnelId ? { funnel_id: currentFunnelId, status: 'active' } : undefined
  );

  const filteredLeads = useMemo(() => {
    if (!search) return leads;
    const term = search.toLowerCase();
    return leads.filter(
      (l: Lead) =>
        l.name.toLowerCase().includes(term) ||
        l.phone.includes(term) ||
        (l.email && l.email.toLowerCase().includes(term))
    );
  }, [leads, search]);

  const isLoading = funnelsLoading || leadsLoading;

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* Top Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar lead por nome ou telefone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-muted py-2 pl-9 pr-4 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          onClick={() => setShowNewLead(true)}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Novo Lead
        </button>
      </div>

      {/* Funnel Tabs */}
      {!funnelsLoading && funnels.length > 0 && (
        <FunnelTabs
          funnels={funnels}
          activeFunnelId={currentFunnelId}
          onSelect={(id) => setActiveFunnelId(id)}
          leads={leads}
        />
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="flex flex-1 items-center justify-center flex-col gap-2 text-sm text-red-400">
          <AlertCircle className="h-8 w-8" />
          <p>Erro ao carregar leads. Verifique a conexão com o servidor.</p>
        </div>
      )}

      {/* Kanban columns */}
      {!isLoading && !error && (
        <div className="flex flex-1 gap-3 overflow-x-auto pb-4">
          {STAGES.map((stage, i) => {
            const stageLeads = filteredLeads.filter(
              (l: Lead) => l.stage_slug === stage.id || l.stage_name === stage.label
            );
            return (
              <KanbanColumn
                key={stage.id}
                stageId={stage.id}
                stageLabel={stage.label}
                leads={stageLeads as any}
                index={i}
              />
            );
          })}
        </div>
      )}

      {/* New Lead Modal */}
      {showNewLead && (
        <NewLeadModal
          funnels={funnels}
          currentFunnelId={currentFunnelId}
          onClose={() => setShowNewLead(false)}
        />
      )}
    </div>
  );
}

export default KanbanBoard;
