import React, { useState } from 'react';
import { Play, Square, Send, Gauge } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';

interface SimulatorControlProps {
  onStart: (intervalSeconds: number) => void;
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
  const [intervalSeconds, setIntervalSeconds] = useState(3);
  const [customMsg, setCustomMsg] = useState('');

  const handleSend = () => {
    if (!customMsg.trim()) return;
    onSendMessage(customMsg);
    setCustomMsg('');
  };

  return (
    <Card padding="none" className="flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary">Simulator</h3>
        <Badge variant={isRunning ? 'emerald' : 'default'} dot pulse={isRunning}>
          {isRunning ? 'Running' : 'Stopped'}
        </Badge>
      </div>

      <div className="p-4 space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-text-tertiary" />
              Interval (seconds)
            </label>
            <span className="font-mono text-xs text-accent-emerald font-medium">
              {intervalSeconds}s
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={15}
            value={intervalSeconds}
            onChange={(e) => setIntervalSeconds(Number(e.target.value))}
            className="w-full"
            aria-label="Simulator interval seconds"
          />
        </div>

        {isRunning ? (
          <Button variant="danger" size="md" icon={<Square className="w-4 h-4" />} onClick={onStop} className="w-full">
            Stop Simulator
          </Button>
        ) : (
          <Button
            variant="primary"
            size="md"
            icon={<Play className="w-4 h-4" />}
            onClick={() => onStart(intervalSeconds)}
            className="w-full"
          >
            Start Simulator
          </Button>
        )}

        <div className="divider" />

        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary">Send Test Message</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Type a viewer message..."
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
            </div>
            <Button
              variant="secondary"
              size="md"
              icon={<Send className="w-4 h-4" />}
              onClick={handleSend}
              disabled={!customMsg.trim()}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};
