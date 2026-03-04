import { Lead } from "@/modules/crm/types/crm";
import { MessageCircle, User, Phone, FileText } from "lucide-react";
import { motion } from "framer-motion";

import { useNavigate } from "react-router-dom";

interface LeadCardProps {
  lead: Lead;
  index: number;
}

const LeadCard = ({ lead, index }: LeadCardProps) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      onClick={() => navigate("/client-hub", { state: { lead } })}
      className="glass-card rounded-lg p-3 cursor-pointer hover:border-primary/40 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground leading-tight">{lead.name}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {lead.phone}
            </p>
          </div>
        </div>
        {lead.origin === "whatsapp" && (
          <MessageCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
        )}
      </div>
      {lead.notes && (
        <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-border/50">
          <FileText className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground line-clamp-2">{lead.notes}</p>
        </div>
      )}
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-muted-foreground">{lead.createdAt}</span>
      </div>
    </motion.div>
  );
};

export default LeadCard;
