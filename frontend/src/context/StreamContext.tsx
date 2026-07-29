import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  fetchHealth,
  startSimulator,
  stopSimulator,
  isDemoMode,
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
  startSim: (intervalSeconds: number) => Promise<void>;
  stopSim: () => Promise<void>;
  wsClient: ChatWebSocketClient;
  demoMode: boolean;
}

const StreamContext = createContext<StreamContextType | undefined>(undefined);

export const StreamProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [activePersona, setActivePersona] = useState('Sarcastic Gamer');
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    backend: false,
    redis: false,
    db: false,
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const demoMode = isDemoMode();

  const wsClient = useMemo(() => new ChatWebSocketClient(), []);

  const checkHealth = async () => {
    try {
      const health = await fetchHealth();
      setSystemStatus({
        backend: health?.status === 'online' || health?.status === 'degraded',
        redis: health?.redis === 'connected',
        db: health?.database === 'connected',
      });
    } catch {
      setSystemStatus({ backend: false, redis: false, db: false });
    }
  };

  const startSim = async (intervalSeconds: number) => {
    await startSimulator(intervalSeconds);
    setIsSimulating(true);
  };

  const stopSim = async () => {
    await stopSimulator();
    setIsSimulating(false);
  };

  useEffect(() => {
    checkHealth();
    if (!demoMode) {
      wsClient.connect();
    }

    const unsubscribe = wsClient.subscribe((data) => {
      const msgText =
        data?.message ||
        data?.data?.ai_response ||
        data?.data?.user_message ||
        data?.data?.message;
      if (!msgText && data?.type === 'system_notice') return;
      if (!msgText) return;

      const isAi =
        Boolean(data.isAiResponse) ||
        data.type === 'ai_response' ||
        Boolean(data?.data?.ai_response && data.message === data?.data?.ai_response);

      const newMsg: ChatMessage = {
        id: data.id || `${Date.now()}-${Math.random()}`,
        timestamp: data.timestamp
          ? new Date(data.timestamp).toLocaleTimeString()
          : new Date().toLocaleTimeString(),
        username: data.username || (isAi ? 'AI Assistant' : 'Viewer'),
        message: msgText,
        isAiResponse: isAi,
        isFiltered: Boolean(data.isFiltered) || data.type === 'filtered',
      };
      setMessages((prev) => [newMsg, ...prev].slice(0, 200));
    });

    return () => {
      unsubscribe();
      wsClient.disconnect();
    };
  }, [wsClient, demoMode]);

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
        demoMode,
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
