import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, CheckCircle, XCircle, MessageSquare, Bot, BotOff,
  FileText, ClipboardList, User, Phone, Mail, Calendar,
  Send, Loader2, Plus, Download, Upload, Info, RefreshCw,
  MessageCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Lead } from "@/modules/crm/types/crm";
import { useLeadNotes, useCreateNote, useLeadConversations, useLeadDocuments, useUpdateLeadStatus, useToggleBotStatus } from "@/hooks/useLeads";
import { leadsApi } from "@/services/api";

// ─── Types ────────────────────────────────────────────────────
type TabKey = "conversas" | "info" | "documentos" | "notas";

const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "conversas", label: "Conversas", icon: <MessageSquare className="w-3.5 h-3.5" /> },
  { key: "info", label: "Informações", icon: <Info className="w-3.5 h-3.5" /> },
  { key: "documentos", label: "Documentos", icon: <FileText className="w-3.5 h-3.5" /> },
  { key: "notas", label: "Notas", icon: <ClipboardList className="w-3.5 h-3.5" /> },
];

// ─── Conversation / Chat Panel ────────────────────────────────
function ConversationsPanel({ leadId }: { leadId: number }) {
  const { data: messages = [], isLoading, refetch } = useLeadConversations(leadId);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      await leadsApi.sendMessage(leadId, draft.trim());
      setDraft("");
      await refetch();
    } catch { /* silent */ }
    finally { setSending(false); }
  };

  if (isLoading) return (
    <div className="flex flex-1 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-accent" />
    </div>
  );

  if (messages.length === 0) return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
      <MessageCircle className="h-10 w-10 opacity-30" />
      <p className="text-sm">Nenhuma mensagem ainda</p>
      <p className="text-xs opacity-60">A conversa aparecerá aqui quando o lead entrar em contato pelo WhatsApp</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin pb-3">
        {messages.map((msg: Record<string, unknown>) => {
          const isOutbound = msg.direction === "outbound";
          const sentAt = msg.sent_at ? new Date(msg.sent_at as string).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
          return (
            <div key={String(msg.id)} className={cn("flex gap-2", isOutbound && "flex-row-reverse")}>
              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1",
                isOutbound ? "bg-accent/20" : "bg-secondary")}>
                {isOutbound
                  ? <User className="w-3.5 h-3.5 text-accent" />
                  : <Bot className="w-3.5 h-3.5 text-muted-foreground" />}
              </div>
              <div className={cn("max-w-[76%] rounded-xl px-3.5 py-2.5",
                isOutbound ? "bg-accent/15 rounded-tr-sm" : "bg-secondary rounded-tl-sm")}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{String(msg.content)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{sentAt}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Send bar */}
      <div className="flex gap-2 pt-3 border-t border-border">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Enviar mensagem como assessor…"
          className="flex-1 bg-secondary rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all"
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim() || sending}
          className="p-2.5 rounded-lg bg-accent text-accent-foreground hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ─── Info Panel ────────────────────────────────────────────────
function InfoPanel({ lead }: { lead: Lead & Record<string, unknown> }) {
  const rows: { icon: React.ReactNode; label: string; value: string | undefined }[] = [
    { icon: <Phone className="w-3.5 h-3.5" />, label: "Telefone", value: lead.phone },
    { icon: <Mail className="w-3.5 h-3.5" />, label: "E-mail", value: lead.email || "—" },
    { icon: <User className="w-3.5 h-3.5" />, label: "CPF", value: (lead.cpf as string) || "—" },
    { icon: <ClipboardList className="w-3.5 h-3.5" />, label: "Funil", value: (lead.funnel_name as string) || "—" },
    { icon: <Calendar className="w-3.5 h-3.5" />, label: "Origem", value: lead.origin },
    { icon: <Calendar className="w-3.5 h-3.5" />, label: "Criado em", value: lead.createdAt || (lead.created_at ? new Date(lead.created_at as string).toLocaleDateString("pt-BR") : "—") },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {rows.map(({ icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 rounded-lg bg-secondary/40 px-3 py-2.5">
            <span className="text-muted-foreground">{icon}</span>
            <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
            <span className="text-sm font-medium flex-1 truncate">{value}</span>
          </div>
        ))}
      </div>

      {lead.description && (
        <div className="rounded-lg bg-secondary/40 px-3 py-3">
          <p className="text-xs text-muted-foreground mb-1.5">Descrição / Observação</p>
          <p className="text-sm leading-relaxed">{lead.description as string}</p>
        </div>
      )}
    </div>
  );
}

// ─── Documents Panel ───────────────────────────────────────────
function DocumentsPanel({ leadId }: { leadId: number }) {
  const { data: docs = [], isLoading } = useLeadDocuments(leadId);

  const statusStyles: Record<string, string> = {
    pendente: "bg-yellow-500/15 text-yellow-400",
    recebido: "bg-blue-500/15 text-blue-400",
    aprovado: "bg-emerald-500/15 text-emerald-400",
    rejeitado: "bg-red-500/15 text-red-400",
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;

  if (docs.length === 0) return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
      <Upload className="h-10 w-10 opacity-30" />
      <p className="text-sm">Nenhum documento recebido</p>
      <p className="text-xs opacity-60">Documentos enviados pelo WhatsApp aparecerão aqui</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {(docs as Record<string, unknown>[]).map((doc) => {
        const status = String(doc.document_type || doc.status || "recebido");
        return (
          <div key={String(doc.id)} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/40 hover:bg-secondary transition-colors group">
            <div className="w-8 h-8 rounded-md bg-card flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{String(doc.name || doc.file_name || "Documento")}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground">{String(doc.file_type || "arquivo")}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusStyles[status] || statusStyles.recebido}`}>{status}</span>
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-1.5 rounded-md hover:bg-card transition-colors">
                <Download className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Notes Panel ───────────────────────────────────────────────
function NotesPanel({ leadId }: { leadId: number }) {
  const { data: notes = [], isLoading, refetch } = useLeadNotes(leadId);
  const createNote = useCreateNote();
  const [draft, setDraft] = useState("");

  const handleAdd = async () => {
    if (!draft.trim()) return;
    try {
      await createNote.mutateAsync({ leadId, content: draft.trim() });
      setDraft("");
      refetch();
    } catch { /* handled by mutation */ }
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin pr-1">
        {(notes as Record<string, unknown>[]).map((note) => {
          const ts = note.created_at ? new Date(note.created_at as string).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
          const isUser = note.creator_type === "user" || note.sender === "assessor";
          return (
            <div key={String(note.id)} className={cn("flex gap-2.5", isUser && "flex-row-reverse")}>
              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1",
                isUser ? "bg-accent/20" : "bg-secondary")}>
                {isUser ? <User className="w-3.5 h-3.5 text-accent" /> : <Bot className="w-3.5 h-3.5 text-muted-foreground" />}
              </div>
              <div className={cn("max-w-[80%] rounded-xl px-3.5 py-2.5",
                isUser ? "bg-accent/10 rounded-tr-sm" : "bg-secondary rounded-tl-sm")}>
                <p className="text-sm leading-relaxed">{String(note.content)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{ts}</p>
              </div>
            </div>
          );
        })}
        {notes.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
            <ClipboardList className="h-8 w-8 opacity-30" />
            <p className="text-sm">Nenhuma nota ainda</p>
          </div>
        )}
      </div>
      <div className="flex gap-2 pt-2 border-t border-border">
        <input
          type="text" value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Adicionar anotação…"
          className="flex-1 bg-secondary rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/50"
        />
        <button
          onClick={handleAdd}
          disabled={!draft.trim() || createNote.isPending}
          className="p-2.5 rounded-lg bg-accent text-accent-foreground hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          {createNote.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
interface CardDetailViewProps {
  initialLead?: Lead & Record<string, unknown>;
}

const CardDetailView = ({ initialLead }: CardDetailViewProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("conversas");
  const updateStatus = useUpdateLeadStatus();
  const toggleBot = useToggleBotStatus();

  if (!initialLead) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <User className="h-12 w-12 opacity-30" />
        <p>Nenhum lead selecionado</p>
        <button onClick={() => navigate("/crm")} className="text-accent text-sm hover:underline">
          ← Voltar ao CRM
        </button>
      </div>
    );
  }

  const lead = initialLead;
  const leadId = Number(lead.id);
  const isBotActive = Boolean(lead.bot_active);
  const verdict = lead.status as string;

  const handleVerdict = (newStatus: "approved" | "rejected") => {
    const toggled = verdict === newStatus ? "active" : newStatus;
    updateStatus.mutate({ id: leadId, status: toggled });
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10 shrink-0">
        <div className="flex items-center justify-between px-4 py-3 gap-3">
          {/* Back + name */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground hover:text-foreground transition flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base font-bold truncate leading-tight">{lead.name}</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Phone className="w-3 h-3" /> {lead.phone}
                {lead.funnel_name && <><span className="opacity-40">·</span><span>{String(lead.funnel_name)}</span></>}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Approve */}
            <button
              onClick={() => handleVerdict("approved")}
              disabled={updateStatus.isPending}
              title="Aprovar lead"
              className={cn("p-2 rounded-lg transition-all",
                verdict === "approved"
                  ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                  : "hover:bg-secondary text-muted-foreground")}
            >
              <CheckCircle className="w-5 h-5" />
            </button>
            {/* Reject */}
            <button
              onClick={() => handleVerdict("rejected")}
              disabled={updateStatus.isPending}
              title="Reprovar lead"
              className={cn("p-2 rounded-lg transition-all",
                verdict === "rejected"
                  ? "bg-red-500/15 text-red-400 ring-1 ring-red-500/30"
                  : "hover:bg-secondary text-muted-foreground")}
            >
              <XCircle className="w-5 h-5" />
            </button>

            <div className="w-px h-5 bg-border mx-0.5" />

            {/* Bot toggle */}
            <button
              onClick={() => toggleBot.mutate(leadId)}
              disabled={toggleBot.isPending}
              title={isBotActive ? "Parar bot" : "Ativar bot"}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ring-1 transition-all",
                isBotActive
                  ? "bg-red-500/10 text-red-400 ring-red-500/30 hover:bg-red-500/20"
                  : "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30 hover:bg-emerald-500/20")}
            >
              {toggleBot.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : isBotActive ? <BotOff className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isBotActive ? "Parar Bot" : "Ativar Bot"}</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto px-4 gap-1 pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors",
                activeTab === tab.key
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              )}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
          <button
            onClick={() => window.location.reload()}
            className="ml-auto p-1.5 rounded-md hover:bg-secondary text-muted-foreground transition"
            title="Atualizar"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-4 py-4 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="h-full"
          >
            {activeTab === "conversas" && <ConversationsPanel leadId={leadId} />}
            {activeTab === "info" && <div className="overflow-y-auto h-full scrollbar-thin"><InfoPanel lead={lead} /></div>}
            {activeTab === "documentos" && <div className="overflow-y-auto h-full scrollbar-thin"><DocumentsPanel leadId={leadId} /></div>}
            {activeTab === "notas" && <NotesPanel leadId={leadId} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CardDetailView;
