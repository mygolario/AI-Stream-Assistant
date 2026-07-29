import React, { useState } from 'react';
import { ChatFeed, ChatMessageItem } from '../components/ChatFeed';
import { SimulatorControl } from '../components/SimulatorControl';
import { StatCard } from '../components/ui/StatCard';
import { AnimatedPage } from '../components/ui/AnimatedPage';
import { ShieldCheck, Zap, Activity } from 'lucide-react';
import { useStreamContext } from '../context/StreamContext';
import { processUserChatMessage } from '../services/aiHelper';

export const ChatMonitorPage: React.FC = () => {
  const { isSimulating, startSim, stopSim, messages, setMessages, wsClient, activePersona } = useStreamContext();
  const [dropRate] = useState<string>('87.4%');
  const [aiSpeed] = useState<string>('320 ms');
  const [tokensSaved] = useState<string>('14,250');


  const handleStartSim = (rate: number) => {
    startSim(rate);
  };

  const handleStopSim = () => {
    stopSim();
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Send through WebSocket client if open backend
    try {
      wsClient.send({
        type: 'client_message',
        message: text,
        username: 'Tester',
        platform: 'simulator',
        channel_id: 'default'
      });
    } catch {}

    // Process user input through AI Engine & Intent Filter
    const result = await processUserChatMessage(text, activePersona);

    const userMsg: ChatMessageItem = {
      id: Date.now().toString() + '-user',
      timestamp: new Date().toLocaleTimeString(),
      username: 'Tester',
      message: text,
      isAiResponse: false,
      isFiltered: result.isFiltered,
    };

    setMessages((prev) => [userMsg, ...prev]);

    // If AI generates a reply, append bot message after ~500ms delay
    if (!result.isFiltered && result.botReply) {
      setTimeout(() => {
        const botMsg: ChatMessageItem = {
          id: Date.now().toString() + '-bot',
          timestamp: new Date().toLocaleTimeString(),
          username: `StreamBot (${activePersona})`,
          message: result.botReply!,
          isAiResponse: true,
          isFiltered: false,
        };
        setMessages((prev) => [botMsg, ...prev]);
      }, 500);
    }
  };

  return (
    <AnimatedPage className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Noise Drop Rate"
          value={dropRate}
          icon={<ShieldCheck className="w-5 h-5" />}
          iconColor="emerald"
          trend={{ value: '+2.1% from last stream', direction: 'up' }}
        />
        <StatCard
          label="AI Response Speed"
          value={aiSpeed}
          icon={<Zap className="w-5 h-5" />}
          iconColor="blue"
          subtitle="Avg. latency per response"
        />
        <StatCard
          label="Tokens Saved"
          value={tokensSaved}
          icon={<Activity className="w-5 h-5" />}
          iconColor="amber"
          trend={{ value: '+18% efficiency', direction: 'up' }}
        />
      </div>

      {/* Main Grid: Feed + Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChatFeed messages={messages} />
        </div>
        <div className="lg:col-span-1">
          <SimulatorControl
            isRunning={isSimulating}
            onStart={handleStartSim}
            onStop={handleStopSim}
            onSendMessage={handleSendMessage}
          />
        </div>
      </div>
    </AnimatedPage>
  );
};
