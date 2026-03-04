import { User, Phone, FileText, Calendar, Hash } from "lucide-react";

interface ClientInfoProps {
  name: string;
  phone: string;
  cpf: string;
  category: string;
  description: string;
  createdAt: string;
}

const ClientInfo = ({ name, phone, cpf, category, description, createdAt }: ClientInfoProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">
        Dados do Cliente
      </h3>

      <div className="space-y-3">
        <div className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted-foreground">Nome</p>
            <p className="text-sm font-medium truncate">{name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center shrink-0">
            <Phone className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted-foreground">Celular</p>
            <p className="text-sm font-medium">{phone}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center shrink-0">
            <Hash className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted-foreground">CPF</p>
            <p className="text-sm font-medium">{cpf}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted-foreground">Categoria</p>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/15 text-primary">
              {category}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted-foreground">Criado em</p>
            <p className="text-sm font-medium">{createdAt}</p>
          </div>
        </div>
      </div>

      {description && (
        <div className="pt-2 border-t border-border">
          <p className="text-[11px] text-muted-foreground mb-1">Descrição</p>
          <p className="text-sm">{description}</p>
        </div>
      )}
    </div>
  );
};

export default ClientInfo;
