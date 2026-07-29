import React, { useEffect, useState } from 'react';
import { ChatFeed } from '../components/ChatFeed';
import { SimulatorControl } from '../components/SimulatorControl';
import { StatCard } from '../components/ui/StatCard';
import { AnimatedPage } from '../components/ui/AnimatedPage';
import { ShieldCheck, Zap, Activity } from 'lucide-react';
import { useStreamContext } from '../context/StreamContext';
import { fetchAnalytics } from '../services/api';

export const ChatMonitorPage: React.FC = () => {
  const { isSimulating, startSim, stopSim, messages, systemStatus, demoMode, wsClient } =
    useStreamContext();
  const [dropRate, setDropRate] = useState('—');
  const [aiReplies, setAiReplies] = useState('—');
  const [tokensSaved, setTokensSaved] = useState('—');

  useEffect(() => {
    fetchAnalytics()
      .then((res) => {
        setDropRate(`${res.filter_rate_percentage ?? 0}%`);
        setAiReplies(String(res.ai_responses_sent ?? 0));
        setTokensSaved(String(res.estimated_tokens_saved ?? 0));
      })
      .catch(() => {});
  }, [messages.length]);

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;
    wsClient.connect();
    wsClient.send({
      type: 'client_message',
      message: text,
      username: 'Tester',
      platform: 'simulator',
      channel_id: 'default',
    });
  };

  return (
    <AnimatedPage className="space-y-6">
      {!systemStatus.backend && !demoMode && (
        <p className="text-sm text-accent-amber border border-accent-amber/30 rounded-md px-3 py-2">
          Backend offline — start the API to see live chat. Demo mode is off.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Noise Drop Rate"
          value={dropRate}
          icon={<ShieldCheck className="w-5 h-5" />}
          iconColor="emerald"
        />
        <StatCard
          label="AI replies"
          value={aiReplies}
          icon={<Zap className="w-5 h-5" />}
          iconColor="amber"
        />
        <StatCard
          label="Tokens saved"
          value={tokensSaved}
          icon={<Activity className="w-5 h-5" />}
          iconColor="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChatFeed messages={messages} />
        </div>
        <SimulatorControl
          isRunning={isSimulating}
          onStart={(interval) => startSim(interval)}
          onStop={() => stopSim()}
          onSendMessage={handleSendMessage}
        />
      </div>
    </AnimatedPage>
  );
};
