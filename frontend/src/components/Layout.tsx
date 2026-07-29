import React, { useState } from 'react';
import { AnimatePresence, motion, Variants } from 'framer-motion';
import { Header } from './Header';
import { Sidebar, TabType } from './Sidebar';
import { CommandBar } from './ui/CommandBar';

interface LayoutProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  children: React.ReactNode;
}

const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -4,
  },
};

export const Layout: React.FC<LayoutProps> = ({ activeTab, setActiveTab, children }) => {
  const [commandBarOpen, setCommandBarOpen] = useState(false);

  const handleNavigate = (id: string) => {
    // Check if it's a page navigation
    const validTabs: TabType[] = ['chat', 'kb', 'persona', 'analytics', 'settings'];
    if (validTabs.includes(id as TabType)) {
      setActiveTab(id as TabType);
    }
    // Actions can be handled here too
  };

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Sidebar Icon Rail */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area (offset by sidebar width) */}
      <div className="flex flex-col flex-1 ml-sidebar">
        {/* Header / Command Bar */}
        <Header
          activeTab={activeTab}
          onCommandBarOpen={() => setCommandBarOpen(true)}
        />

        {/* Page Content with Transitions */}
        <main className="flex-1 p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="max-w-[1400px] mx-auto"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Command Bar (⌘K) */}
      <CommandBar
        open={commandBarOpen}
        onOpenChange={setCommandBarOpen}
        onNavigate={handleNavigate}
      />
    </div>
  );
};
