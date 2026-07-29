import React, { useState } from 'react';
import { ChatFeed, ChatMessageItem } from '../components/ChatFeed';
import { SimulatorControl } from '../components/SimulatorControl';
import { GlassCard } from '../components/GlassCard';
import { ShieldCheck, Zap, Activity } from 'lucide-react';
import { useStreamContext } from '../context/StreamContext';

export const ChatMonitorPage: React.FC = () => {
  const { isSimulating, startSim, stopSim, messages, setMessages, wsClient } = useStreamContext();
  const [dropRate] = useState<string>('87.4%');
  const [aiSpeed] = useState<string>('320 ms');
  const [tokensSaved] = useState<string>('14,250');

  const handleStartSim = (rate: number) => {
    startSim(rate);
  };

  const handleStopSim = () => {
    stopSim();
  };

  const handleSendMessage = (text: string) => {
    const newMsg: ChatMessageItem = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString(),
      username: 'Tester',
      message: text,
      isAiResponse: false,
      isFiltered: false,
    };
    setMessages((prev) => [newMsg, ...prev]);

    // Send through WebSocket client if open
    try {
      wsClient.send({
        type: 'client_message',
        message: text,
        username: 'Tester',
        platform: 'simulator',
        channel_id: 'default'
      });
    } catch (err) {
      console.warn('WS send failed (offline fallback active):', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-3 gap-4">
        <GlassCard className="flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Noise Drop Rate</div>
            <div className="text-2xl font-bold text-slate-100">{dropRate}</div>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center space-x-4">
          <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400">AI Response Speed</div>
            <div className="text-2xl font-bold text-slate-100">{aiSpeed}</div>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center space-x-4">
          <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Tokens Saved</div>
            <div className="text-2xl font-bold text-slate-100">{tokensSaved}</div>
          </div>
        </GlassCard>
      </div>

      {/* Main Grid: Feed + Controls */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <ChatFeed messages={messages} />
        </div>
        <div className="col-span-1">
          <SimulatorControl
            isRunning={isSimulating}
            onStart={handleStartSim}
            onStop={handleStopSim}
            onSendMessage={handleSendMessage}
          />
        </div>
      </div>
    </div>
  );
};
