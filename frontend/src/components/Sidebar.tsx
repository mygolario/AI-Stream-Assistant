import React from 'react';
import { MessageSquare, BookOpen, Bot, BarChart3, Settings } from 'lucide-react';

export type TabType = 'chat' | 'kb' | 'persona' | 'analytics' | 'settings';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'chat' as TabType, label: 'Live Chat Monitor', icon: MessageSquare },
    { id: 'kb' as TabType, label: 'Knowledge Base', icon: BookOpen },
    { id: 'persona' as TabType, label: 'Bot Persona', icon: Bot },
    { id: 'analytics' as TabType, label: 'Analytics', icon: BarChart3 },
    { id: 'settings' as TabType, label: 'Settings & Guide', icon: Settings },
  ];

  return (
    <aside className="w-64 glass-panel flex flex-col p-4 space-y-2 border-r border-slate-800">
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Navigation
      </div>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
              isActive
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-lg shadow-purple-900/20'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-purple-400' : 'text-slate-500'}`} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </aside>
  );
};
