import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  fetchHealth,
  startSimulator,
  stopSimulator,
} from '../services/api';
import { ChatWebSocketClient } from '../services/websocket';

export interface SystemStatus {
  backend: boolean;
  redis: boolean;
  db: boolean;
}

export interface ChatMessage {
  id: string;
  timestamp: string;
  username: string;
  message: string;
  isAiResponse: boolean;
  isFiltered: boolean;
}

interface StreamContextType {
  isSimulating: boolean;
  setIsSimulating: (simulating: boolean) => void;
  activePersona: string;
  setActivePersona: (persona: string) => void;
  systemStatus: SystemStatus;
  setSystemStatus: React.Dispatch<React.SetStateAction<SystemStatus>>;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  checkHealth: () => Promise<void>;
  startSim: (rate: number) => Promise<void>;
  stopSim: () => Promise<void>;
  wsClient: ChatWebSocketClient;
}

const initialMessages: ChatMessage[] = [
  {
    id: '1',
    timestamp: new Date().toLocaleTimeString(),
    username: 'GamerGurl99',
    message: 'gg nice play!!',
    isAiResponse: false,
    isFiltered: true,
  },
  {
    id: '2',
    timestamp: new Date().toLocaleTimeString(),
    username: 'TechViewer',
    message: 'What GPU are you using for streaming?',
    isAiResponse: false,
    isFiltered: false,
  },
  {
    id: '3',
    timestamp: new Date().toLocaleTimeString(),
    username: 'StreamBot AI',
    message: 'The streamer is running an NVIDIA RTX 4090 alongside an i9-14900K!',
    isAiResponse: true,
    isFiltered: false,
  },
];

const MOCK_SIM_PAIRS = [
  {
    user: 'CyberKnight',
    msg: 'what mouse are you using bro?',
    bot: 'Streamer is currently using the Logitech G Pro X Superlight!',
    filtered: false,
  },
  {
    user: 'CoolCat_42',
    msg: 'gg lol emote spam',
    bot: '',
    filtered: true,
  },
  {
    user: 'ApexPredator',
    msg: 'is there a discord link?',
    bot: 'Join the official community Discord at https://discord.gg/streamer !',
    filtered: false,
  },
  {
    user: 'VibeCheck',
    msg: 'what games do you stream?',
    bot: 'Streamer main rotation: Hunt Showdown, Call of Duty Warzone, and PUBG!',
    filtered: false,
  },
];

const StreamContext = createContext<StreamContextType | undefined>(undefined);

export const StreamProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [activePersona, setActivePersona] = useState<string>('Sarcastic Gamer');
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    backend: true,
    redis: true,
    db: true,
  });
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);

  const wsClient = useMemo(() => {
    return new ChatWebSocketClient();
  }, []);

  const checkHealth = async () => {
    try {
      const health = await fetchHealth();
      setSystemStatus({
        backend: health?.status === 'online' || health?.status === 'ok' || health?.status === 'degraded' || health?.mode === 'standalone',
        redis: health?.redis === 'connected' || health?.mode === 'standalone',
        db: health?.database === 'connected' || health?.mode === 'standalone',
      });
    } catch {
      setSystemStatus({
        backend: true,
        redis: true,
        db: true,
      });
    }
  };

  const startSim = async (rate: number) => {
    try {
      await startSimulator(rate);
    } catch {}
    setIsSimulating(true);
  };

  const stopSim = async () => {
    try {
      await stopSimulator();
    } catch {}
    setIsSimulating(false);
  };

  useEffect(() => {
    checkHealth();

    // Subscribe to WebSocket messages if connected
    const unsubscribe = wsClient.subscribe((data) => {
      if (data && data.message) {
        const newMsg: ChatMessage = {
          id: data.id || Date.now().toString(),
          timestamp: data.timestamp || new Date().toLocaleTimeString(),
          username: data.username || (data.isAiResponse ? 'StreamBot AI' : 'Viewer'),
          message: data.message,
          isAiResponse: Boolean(data.isAiResponse),
          isFiltered: Boolean(data.isFiltered),
        };
        setMessages((prev) => [newMsg, ...prev]);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [wsClient]);

  // Fallback client simulation generator
  useEffect(() => {
    if (!isSimulating) return;

    let simIdx = 0;
    const interval = setInterval(() => {
      const pair = MOCK_SIM_PAIRS[simIdx % MOCK_SIM_PAIRS.length];
      simIdx++;

      const userMsg: ChatMessage = {
        id: Date.now().toString() + '-user',
        timestamp: new Date().toLocaleTimeString(),
        username: pair.user,
        message: pair.msg,
        isAiResponse: false,
        isFiltered: pair.filtered,
      };

      setMessages((prev) => [userMsg, ...prev]);

      if (!pair.filtered && pair.bot) {
        setTimeout(() => {
          const aiMsg: ChatMessage = {
            id: Date.now().toString() + '-bot',
            timestamp: new Date().toLocaleTimeString(),
            username: `StreamBot (${activePersona})`,
            message: pair.bot,
            isAiResponse: true,
            isFiltered: false,
          };
          setMessages((prev) => [aiMsg, ...prev]);
        }, 800);
      }
    }, 3200);

    return () => clearInterval(interval);
  }, [isSimulating, activePersona]);

  return (
    <StreamContext.Provider
      value={{
        isSimulating,
        setIsSimulating,
        activePersona,
        setActivePersona,
        systemStatus,
        setSystemStatus,
        messages,
        setMessages,
        checkHealth,
        startSim,
        stopSim,
        wsClient,
      }}
    >
      {children}
    </StreamContext.Provider>
  );
};

export const useStreamContext = () => {
  const context = useContext(StreamContext);
  if (!context) {
    throw new Error('useStreamContext must be used within a StreamProvider');
  }
  return context;
};
