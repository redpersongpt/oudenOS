import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { pageTransition } from "@redcore/design-system";
import { Sidebar } from "./Sidebar";
import { TitleBar } from "./TitleBar";

export function AppLayout() {
  const location = useLocation();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-page">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TitleBar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <motion.div
            key={location.pathname}
            variants={pageTransition}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="min-h-full px-6 py-6"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
