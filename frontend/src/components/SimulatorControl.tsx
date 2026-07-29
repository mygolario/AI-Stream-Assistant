import React, { useState } from 'react';
import { Play, Square, Send, Gauge } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface SimulatorControlProps {
  onStart: (rate: number) => void;
  onStop: () => void;
  onSendMessage: (msg: string) => void;
  isRunning: boolean;
}

export const SimulatorControl: React.FC<SimulatorControlProps> = ({
  onStart,
  onStop,
  onSendMessage,
  isRunning,
}) => {
  const [rate, setRate] = useState<number>(3);
  const [customMsg, setCustomMsg] = useState<string>('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMsg.trim()) return;
    onSendMessage(customMsg);
    setCustomMsg('');
  };

  return (
    <GlassCard className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="font-semibold text-slate-200">Mock Stream Simulator</h3>
        <span className={`px-2 py-0.5 text-xs rounded-full border ${
          isRunning 
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
            : 'bg-slate-800 text-slate-400 border-slate-700'
        }`}>
          {isRunning ? 'Running' : 'Stopped'}
        </span>
      </div>

      {/* Speed Rate Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center space-x-1">
            <Gauge className="w-3.5 h-3.5 text-slate-500" />
            <span>Message Rate</span>
          </span>
          <span className="font-mono text-purple-400">{rate} msg/sec</span>
        </div>
        <input
          type="range"
          min="1"
          max="10"
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
          disabled={isRunning}
          className="w-full accent-purple-500 bg-slate-800 rounded-lg cursor-pointer"
        />
      </div>

      {/* Simulator Start/Stop Button */}
      <div className="flex space-x-3">
        {!isRunning ? (
          <button
            onClick={() => onStart(rate)}
            className="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm flex items-center justify-center space-x-2 transition-all shadow-lg shadow-purple-900/30"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Simulator</span>
          </button>
        ) : (
          <button
            onClick={onStop}
            className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm flex items-center justify-center space-x-2 transition-all"
          >
            <Square className="w-4 h-4 fill-current" />
            <span>Stop Simulator</span>
          </button>
        )}
      </div>

      {/* Send Custom Message Input */}
      <form onSubmit={handleSend} className="pt-2 border-t border-slate-800 flex space-x-2">
        <input
          type="text"
          placeholder="Inject custom viewer message..."
          value={customMsg}
          onChange={(e) => setCustomMsg(e.target.value)}
          className="flex-1 bg-slate-900/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
        />
        <button
          type="submit"
          className="p-2 bg-slate-800 hover:bg-slate-700 text-purple-400 rounded-xl border border-slate-700 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </GlassCard>
  );
};
