import React from 'react';
import { Activity, Radio, Cpu, Sparkles } from 'lucide-react';
import { useStreamContext } from '../context/StreamContext';

interface HeaderProps {
  status?: { backend: boolean; redis: boolean; db: boolean };
  activePersona?: string;
  isSimulating?: boolean;
}

export const Header: React.FC<HeaderProps> = (props) => {
  const context = useStreamContext();
  const status = props.status ?? context.systemStatus;
  const activePersona = props.activePersona ?? context.activePersona;
  const isSimulating = props.isSimulating ?? context.isSimulating;

  return (
    <header className="glass-panel sticky top-0 z-40 px-6 py-4 flex items-center justify-between border-b border-slate-800">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-purple-600/20 rounded-lg border border-purple-500/30">
          <Sparkles className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold gradient-text">AI Stream Assistant</h1>
          <p className="text-xs text-slate-400">Real-Time Co-Host & Chat Manager</p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Active Persona Badge */}
        <div className="px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs flex items-center space-x-2">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400">Persona:</span>
          <span className="font-semibold text-cyan-300">{activePersona}</span>
        </div>

        {/* Simulator Status */}
        <div className={`px-3 py-1.5 rounded-full border text-xs flex items-center space-x-2 ${
          isSimulating 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-slate-800/80 border-slate-700 text-slate-400'
        }`}>
          <Radio className={`w-3.5 h-3.5 ${isSimulating ? 'animate-pulse text-emerald-400' : 'text-slate-500'}`} />
          <span>{isSimulating ? 'Live Streaming' : 'Simulator Standby'}</span>
        </div>

        {/* System Health Indicators */}
        <div className="flex items-center space-x-2 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
          <Activity className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400">Health:</span>
          <span className={`inline-block w-2 h-2 rounded-full ${status.backend && status.db && status.redis ? 'bg-emerald-400' : status.backend ? 'bg-amber-400' : 'bg-rose-500'}`} />
        </div>
      </div>
    </header>
  );
};
