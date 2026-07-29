import React from 'react';
import { motion } from 'framer-motion';
import { Bot, User, ShieldOff } from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';

export interface ChatMessageItem {
  id: string;
  timestamp: string;
  username: string;
  message: string;
  isAiResponse: boolean;
  isFiltered: boolean;
}

interface ChatFeedProps {
  messages: ChatMessageItem[];
}

const messageVariants = {
  initial: { opacity: 0, x: -12 },
  animate: { opacity: 1, x: 0 },
};

export const ChatFeed: React.FC<ChatFeedProps> = ({ messages }) => {
  return (
    <Card padding="none" className="flex flex-col h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary">Chat Feed</h3>
        <span className="font-mono text-xs text-text-tertiary">
          {messages.length} messages
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
            No messages yet. Start the simulator or send a message.
          </div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={msg.id}
            variants={messageVariants}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
            className={`
              flex items-start gap-3 px-3 py-2.5 rounded-md transition-colors
              ${msg.isFiltered
                ? 'opacity-40 bg-transparent'
                : msg.isAiResponse
                  ? 'bg-accent-blue-subtle border-l-2 border-l-accent-blue'
                  : 'bg-transparent hover:bg-surface-2'
              }
            `}
          >
            {/* Avatar */}
            <div className={`
              w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5
              ${msg.isFiltered
                ? 'bg-surface-2 text-text-tertiary'
                : msg.isAiResponse
                  ? 'bg-accent-blue-muted text-accent-blue'
                  : 'bg-surface-2 text-text-tertiary'
              }
            `}>
              {msg.isFiltered ? (
                <ShieldOff className="w-3.5 h-3.5" />
              ) : msg.isAiResponse ? (
                <Bot className="w-3.5 h-3.5" />
              ) : (
                <User className="w-3.5 h-3.5" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-xs font-medium ${
                  msg.isAiResponse ? 'text-accent-blue' : 'text-text-secondary'
                }`}>
                  {msg.username}
                </span>
                <span className="text-[10px] text-text-tertiary font-mono">
                  {msg.timestamp}
                </span>
                {msg.isFiltered && (
                  <Badge variant="amber" className="text-[10px] py-0">Filtered</Badge>
                )}
              </div>
              <p className={`text-sm leading-relaxed ${
                msg.isFiltered ? 'line-through text-text-tertiary' : 'text-text-primary'
              }`}>
                {msg.message}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
};
