import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  BookOpen,
  Bot,
  BarChart3,
  Settings,
  Zap,
} from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';

export type TabType = 'chat' | 'kb' | 'persona' | 'analytics' | 'settings';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

const navItems = [
  { id: 'chat' as TabType, label: 'Live Chat', icon: MessageSquare },
  { id: 'kb' as TabType, label: 'Knowledge Base', icon: BookOpen },
  { id: 'persona' as TabType, label: 'Bot Persona', icon: Bot },
  { id: 'analytics' as TabType, label: 'Analytics', icon: BarChart3 },
  { id: 'settings' as TabType, label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Tooltip.Provider delayDuration={200} skipDelayDuration={0}>
      <motion.aside
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        animate={{ width: isExpanded ? 220 : 56 }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className="fixed left-0 top-0 bottom-0 bg-surface-0 border-r border-border z-50 flex flex-col overflow-hidden"
      >
        {/* Logo */}
        <div className="flex items-center h-header px-3.5 border-b border-border flex-shrink-0">
          <div className="w-7 h-7 rounded-md bg-accent-blue flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <AnimatePresence>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -4 }}
                transition={{ duration: 0.15 }}
                className="ml-3 text-sm font-semibold text-text-primary whitespace-nowrap"
              >
                StreamAI
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-1 p-2 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            const button = (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`
                  relative w-full flex items-center rounded-md transition-all duration-150
                  ${isExpanded ? 'px-3 py-2 gap-3' : 'px-0 py-2 justify-center'}
                  ${isActive
                    ? 'bg-accent-blue-muted text-accent-blue'
                    : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-2'
                  }
                `}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-accent-blue"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                <AnimatePresence>
                  {isExpanded && (
                    <motion.span
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -4 }}
                      transition={{ duration: 0.12 }}
                      className="text-sm font-medium whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            );

            // Only show tooltip when collapsed
            if (!isExpanded) {
              return (
                <Tooltip.Root key={item.id}>
                  <Tooltip.Trigger asChild>
                    {button}
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      side="right"
                      sideOffset={8}
                      className="px-2.5 py-1.5 rounded-md bg-surface-2 border border-border text-xs text-text-primary shadow-card z-[60]"
                    >
                      {item.label}
                      <Tooltip.Arrow className="fill-surface-2" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              );
            }

            return <React.Fragment key={item.id}>{button}</React.Fragment>;
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-2 border-t border-border flex-shrink-0">
          <div className={`flex items-center ${isExpanded ? 'px-3 py-2 gap-3' : 'justify-center py-2'}`}>
            <div className="w-2 h-2 rounded-full bg-accent-emerald flex-shrink-0" style={{ boxShadow: '0 0 6px rgba(16, 185, 129, 0.5)' }} />
            <AnimatePresence>
              {isExpanded && (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={{ duration: 0.12 }}
                  className="text-xs text-text-tertiary whitespace-nowrap"
                >
                  System Online
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.aside>
    </Tooltip.Provider>
  );
};
