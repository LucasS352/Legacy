import { useState } from "react";
import KanbanBoard from "../modules/crm/components/crm/KanbanBoard";
import BottomNavBar from "../modules/crm/components/BottomNavBar";
import DashboardView from "../modules/crm/components/dashboard/DashboardView";
import TasksView from "../modules/crm/components/tasks/TasksView";
import { AnimatePresence, motion } from "framer-motion";

type Tab = "crm" | "dashboard" | "tarefas";

const CRM = () => {
  const [activeTab, setActiveTab] = useState<Tab>("crm");

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <div className="flex-1 overflow-hidden pb-20">
        <AnimatePresence mode="wait">
          {activeTab === "crm" && (
            <motion.div
              key="crm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              <KanbanBoard />
            </motion.div>
          )}
          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              <DashboardView />
            </motion.div>
          )}
          {activeTab === "tarefas" && (
            <motion.div
              key="tarefas"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              <TasksView />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <BottomNavBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default CRM;
