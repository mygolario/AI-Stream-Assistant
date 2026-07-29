import React, { useEffect, useState, useCallback } from 'react';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  BookOpen,
  Bot,
  BarChart3,
  Settings,
  Search,
  ArrowRight,
} from 'lucide-react';

interface CommandBarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (tab: string) => void;
}

const pages = [
  { id: 'chat', label: 'Live Chat Monitor', icon: MessageSquare, shortcut: '1' },
  { id: 'kb', label: 'Knowledge Base', icon: BookOpen, shortcut: '2' },
  { id: 'persona', label: 'Bot Persona', icon: Bot, shortcut: '3' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, shortcut: '4' },
  { id: 'settings', label: 'Settings & Guide', icon: Settings, shortcut: '5' },
];

const actions = [
  { id: 'start-sim', label: 'Start Mock Simulator', group: 'Actions' },
  { id: 'stop-sim', label: 'Stop Simulator', group: 'Actions' },
  { id: 'add-kb', label: 'Add Knowledge Base Item', group: 'Actions' },
];

export const CommandBar: React.FC<CommandBarProps> = ({ open, onOpenChange, onNavigate }) => {
  const [search, setSearch] = useState('');

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  const handleSelect = useCallback((id: string) => {
    onNavigate(id);
    onOpenChange(false);
    setSearch('');
  }, [onNavigate, onOpenChange]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] bg-black/60"
            onClick={() => onOpenChange(false)}
          />

          {/* Command Menu */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed left-1/2 top-[20%] -translate-x-1/2 z-[101] w-full max-w-lg"
          >
            <Command
              className="bg-surface-1 border border-border rounded-xl shadow-command overflow-hidden"
              label="Command Menu"
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <Search className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search pages, actions..."
                  className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
                />
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-surface-2 border border-border text-[10px] text-text-tertiary font-mono">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <Command.List className="max-h-72 overflow-y-auto p-2">
                <Command.Empty className="px-4 py-8 text-center text-sm text-text-tertiary">
                  No results found.
                </Command.Empty>

                {/* Navigation */}
                <Command.Group heading="Pages" className="mb-2">
                  <p className="px-2 py-1.5 text-xs font-medium text-text-tertiary">Pages</p>
                  {pages.map((page) => {
                    const Icon = page.icon;
                    return (
                      <Command.Item
                        key={page.id}
                        value={page.label}
                        onSelect={() => handleSelect(page.id)}
                        className="flex items-center gap-3 px-2 py-2 rounded-md text-sm text-text-secondary cursor-pointer
                          hover:bg-surface-2 hover:text-text-primary data-[selected=true]:bg-surface-2 data-[selected=true]:text-text-primary
                          transition-colors duration-100"
                      >
                        <Icon className="w-4 h-4 text-text-tertiary" />
                        <span className="flex-1">{page.label}</span>
                        <kbd className="text-[10px] font-mono text-text-tertiary bg-surface-2 px-1.5 py-0.5 rounded border border-border">
                          {page.shortcut}
                        </kbd>
                        <ArrowRight className="w-3 h-3 text-text-tertiary opacity-0 group-hover:opacity-100" />
                      </Command.Item>
                    );
                  })}
                </Command.Group>

                {/* Actions */}
                <Command.Group heading="Actions" className="mb-2">
                  <p className="px-2 py-1.5 text-xs font-medium text-text-tertiary">Actions</p>
                  {actions.map((action) => (
                    <Command.Item
                      key={action.id}
                      value={action.label}
                      onSelect={() => handleSelect(action.id)}
                      className="flex items-center gap-3 px-2 py-2 rounded-md text-sm text-text-secondary cursor-pointer
                        hover:bg-surface-2 hover:text-text-primary data-[selected=true]:bg-surface-2 data-[selected=true]:text-text-primary
                        transition-colors duration-100"
                    >
                      <ArrowRight className="w-4 h-4 text-text-tertiary" />
                      <span className="flex-1">{action.label}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
