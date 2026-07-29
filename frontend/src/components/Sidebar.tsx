import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  BookOpen,
  Bot,
  BarChart3,
  Settings,
  Zap,
  Radio,
  CreditCard,
  Building2,
} from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';

export type TabType =
  | 'chat'
  | 'live'
  | 'kb'
  | 'persona'
  | 'analytics'
  | 'billing'
  | 'agency'
  | 'settings';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

const navItems: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'chat', label: 'Live Chat', icon: MessageSquare },
  { id: 'live', label: 'Live Control', icon: Radio },
  { id: 'kb', label: 'Knowledge Base', icon: BookOpen },
  { id: 'persona', label: 'Bot Persona', icon: Bot },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'agency', label: 'Agency', icon: Building2 },
  { id: 'settings', label: 'Settings', icon: Settings },
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
        className="fixed left-0 top-0 bottom-0 bg-surface-0/95 border-r border-border z-50 flex flex-col overflow-hidden backdrop-blur"
      >
        <div className="flex items-center h-header px-3.5 border-b border-border flex-shrink-0">
          <div className="w-7 h-7 rounded-md bg-accent-emerald flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-canvas" />
          </div>
          <AnimatePresence>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -4 }}
                className="ml-3 text-sm font-display text-text-primary whitespace-nowrap tracking-tight"
              >
                StreamAI
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 flex flex-col gap-1 p-2 mt-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const button = (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                onClick={() => setActiveTab(item.id)}
                className={`
                  relative w-full flex items-center rounded-md transition-all duration-150
                  ${isExpanded ? 'px-3 py-2 gap-3' : 'px-0 py-2 justify-center'}
                  ${
                    isActive
                      ? 'bg-accent-emerald-muted text-accent-emerald'
                      : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-2'
                  }
                `}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-accent-emerald rounded-r"
                  />
                )}
                <Icon className="w-4 h-4 flex-shrink-0" />
                {isExpanded && <span className="text-sm whitespace-nowrap">{item.label}</span>}
              </button>
            );

            if (isExpanded) return button;
            return (
              <Tooltip.Root key={item.id}>
                <Tooltip.Trigger asChild>{button}</Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    side="right"
                    className="bg-surface-3 border border-border text-xs px-2 py-1 rounded shadow-card z-[60]"
                  >
                    {item.label}
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            );
          })}
        </nav>
      </motion.aside>
    </Tooltip.Provider>
  );
};
