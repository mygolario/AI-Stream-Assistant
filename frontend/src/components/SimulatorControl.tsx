import React, { useState } from 'react';
import { Play, Square, Send, Gauge } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';

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
  const [rate, setRate] = useState(3);
  const [customMsg, setCustomMsg] = useState('');

  const handleSend = () => {
    if (!customMsg.trim()) return;
    onSendMessage(customMsg);
    setCustomMsg('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <Card padding="none" className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary">Simulator</h3>
        <Badge
          variant={isRunning ? 'emerald' : 'default'}
          dot
          pulse={isRunning}
        >
          {isRunning ? 'Running' : 'Stopped'}
        </Badge>
      </div>

      <div className="p-4 space-y-5">
        {/* Message Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-text-tertiary" />
              Message Rate
            </label>
            <span className="font-mono text-xs text-accent-blue font-medium">
              {rate} msg/s
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-text-tertiary">
            <span>1/s</span>
            <span>10/s</span>
          </div>
        </div>

        {/* Start / Stop */}
        <div>
          {isRunning ? (
            <Button
              variant="danger"
              size="md"
              icon={<Square className="w-4 h-4" />}
              onClick={onStop}
              className="w-full"
            >
              Stop Simulator
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              icon={<Play className="w-4 h-4" />}
              onClick={() => onStart(rate)}
              className="w-full"
            >
              Start Simulator
            </Button>
          )}
        </div>

        {/* Divider */}
        <div className="divider" />

        {/* Manual Message */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary">
            Send Test Message
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Type a viewer message..."
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                onKeyDown={handleKeyDown}
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
