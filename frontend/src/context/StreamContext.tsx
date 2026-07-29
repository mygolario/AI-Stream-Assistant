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
    timestamp: '15:44:01',
    username: 'GamerGurl99',
    message: 'gg nice play!!',
    isAiResponse: false,
    isFiltered: true,
  },
  {
    id: '2',
    timestamp: '15:44:05',
    username: 'TechViewer',
    message: 'What GPU are you using for streaming?',
    isAiResponse: false,
    isFiltered: false,
  },
  {
    id: '3',
    timestamp: '15:44:06',
    username: 'StreamBot AI',
    message: 'The streamer is running an NVIDIA RTX 4090 alongside an i9-14900K!',
    isAiResponse: true,
    isFiltered: false,
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
        backend: health?.status === 'online' || health?.status === 'ok' || health?.status === 'degraded',
        redis: health?.redis === 'connected',
        db: health?.database === 'connected',
      });
    } catch (err) {
      console.warn('Health check failed, using fallback status:', err);
      setSystemStatus({
        backend: false,
        redis: false,
        db: false,
      });
    }
  };

  const startSim = async (rate: number) => {
    try {
      await startSimulator(rate);
    } catch (err) {
      console.warn('Backend startSimulator API call failed, using client simulation mode:', err);
    }
    setIsSimulating(true);
  };

  const stopSim = async () => {
    try {
      await stopSimulator();
    } catch (err) {
      console.warn('Backend stopSimulator API call failed:', err);
    }
    setIsSimulating(false);
  };

  useEffect(() => {
    checkHealth();

    // Subscribe to WebSocket messages
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
