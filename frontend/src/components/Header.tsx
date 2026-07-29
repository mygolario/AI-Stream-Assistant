import React from 'react';
import { Search, Cpu, Activity } from 'lucide-react';
import { useStreamContext } from '../context/StreamContext';
import { Badge } from './ui/Badge';
import { TabType } from './Sidebar';

interface HeaderProps {
  activeTab: TabType;
  onCommandBarOpen: () => void;
}

const tabTitles: Record<TabType, string> = {
  chat: 'Live Chat Monitor',
  kb: 'Knowledge Base',
  persona: 'Bot Persona',
  analytics: 'Analytics',
  settings: 'Settings & Guide',
};

export const Header: React.FC<HeaderProps> = ({ activeTab, onCommandBarOpen }) => {
  const { systemStatus, activePersona, isSimulating } = useStreamContext();

  const allHealthy = systemStatus.backend && systemStatus.db && systemStatus.redis;
  const partialHealth = systemStatus.backend;

  return (
    <header className="h-header flex items-center justify-between px-6 border-b border-border bg-surface-0/80 backdrop-blur-sm sticky top-0 z-30">
      {/* Left: Page Title */}
      <h1 className="text-sm font-semibold text-text-primary">
        {tabTitles[activeTab]}
      </h1>

      {/* Center: Command Bar Trigger */}
      <button
        onClick={onCommandBarOpen}
        className="command-trigger hidden sm:flex"
      >
        <Search className="w-3.5 h-3.5" />
        <span>Search...</span>
        <kbd className="ml-4 text-[10px] font-mono text-text-tertiary bg-surface-2 px-1.5 py-0.5 rounded border border-border">
          ⌘K
        </kbd>
      </button>

      {/* Right: Status Indicators */}
      <div className="flex items-center gap-3">
        {/* Persona */}
        <Badge variant="blue">
          <Cpu className="w-3 h-3" />
          {activePersona}
        </Badge>

        {/* Simulator Status */}
        <Badge
          variant={isSimulating ? 'emerald' : 'default'}
          dot
          pulse={isSimulating}
        >
          {isSimulating ? 'Live' : 'Standby'}
        </Badge>

        {/* Health */}
        <div className="flex items-center gap-2 pl-3 border-l border-border">
          <Activity className="w-3.5 h-3.5 text-text-tertiary" />
          <span
            className={`status-dot ${
              allHealthy ? 'status-dot-live' : partialHealth ? 'bg-accent-amber' : 'status-dot-error'
            }`}
          />
        </div>
      </div>
    </header>
  );
};
