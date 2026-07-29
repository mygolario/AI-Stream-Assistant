import React from 'react';
import { Filter, Bot, User } from 'lucide-react';
import { GlassCard } from './GlassCard';

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

export const ChatFeed: React.FC<ChatFeedProps> = ({ messages }) => {
  return (
    <GlassCard className="flex flex-col h-[600px]">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
        <h3 className="font-semibold text-slate-200 flex items-center space-x-2">
          <span>Stream Chat Monitor</span>
        </h3>
        <span className="text-xs text-slate-500">{messages.length} messages received</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            No messages yet. Start the Mock Stream Simulator to test live chat!
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-3 rounded-lg text-sm transition-all ${
                msg.isFiltered
                  ? 'bg-slate-900/40 border border-slate-800/60 opacity-60'
                  : msg.isAiResponse
                  ? 'bg-purple-950/40 border border-purple-500/30'
                  : 'bg-slate-800/40 border border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1 text-xs">
                <div className="flex items-center space-x-2">
                  {msg.isAiResponse ? (
                    <span className="flex items-center space-x-1 text-purple-400 font-semibold">
                      <Bot className="w-3.5 h-3.5" />
                      <span>StreamBot AI</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 text-cyan-400 font-medium">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>{msg.username}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2 text-slate-500">
                  {msg.isFiltered && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center space-x-1 text-[10px]">
                      <Filter className="w-2.5 h-2.5" />
                      <span>Filtered (Noise)</span>
                    </span>
                  )}
                  <span>{msg.timestamp}</span>
                </div>
              </div>

              <p className={`text-slate-300 ${msg.isAiResponse ? 'text-purple-200 font-medium' : ''}`}>
                {msg.message}
              </p>
            </div>
          ))
        )}
      </div>
    </GlassCard>
  );
};
