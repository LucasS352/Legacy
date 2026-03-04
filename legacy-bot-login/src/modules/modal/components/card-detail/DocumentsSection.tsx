import { FileText, Upload, Download, Eye, Plus } from "lucide-react";

interface Document {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
  status: "pendente" | "recebido" | "aprovado";
}

interface DocumentsSectionProps {
  documents: Document[];
}

const statusStyles: Record<string, string> = {
  pendente: "bg-primary/15 text-primary",
  recebido: "bg-accent/15 text-accent",
  aprovado: "bg-success/15 text-success",
};

const DocumentsSection = ({ documents }: DocumentsSectionProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">
          Documentos
        </h3>
        <button className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
          <Plus className="w-3.5 h-3.5" />
          Adicionar
        </button>
      </div>

      <div className="space-y-2">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
          >
            <div className="w-8 h-8 rounded-md bg-card flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{doc.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground">{doc.type}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusStyles[doc.status]}`}>
                  {doc.status}
                </span>
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-1.5 rounded-md hover:bg-card transition-colors">
                <Eye className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button className="p-1.5 rounded-md hover:bg-card transition-colors">
                <Download className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
        ))}

        {documents.length === 0 && (
          <div className="flex flex-col items-center py-6 text-muted-foreground">
            <Upload className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs">Nenhum documento anexado</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentsSection;
