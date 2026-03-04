import { BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

const PlaceholderView = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center h-full gap-4"
    >
      <div className="w-16 h-16 rounded-2xl gold-gradient flex items-center justify-center">
        <BarChart3 className="w-8 h-8 text-primary-foreground" />
      </div>
      <h2 className="text-xl font-display font-bold text-foreground">Dashboard</h2>
      <p className="text-sm text-muted-foreground">Módulo em desenvolvimento</p>
    </motion.div>
  );
};

export default PlaceholderView;
