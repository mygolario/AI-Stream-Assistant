export type WebSocketMessageHandler = (data: any) => void;

function resolveWsUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_WS_URL;
  if (envUrl) return envUrl;
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.host;
  const token = localStorage.getItem('asa_token');
  const q = token ? `?token=${encodeURIComponent(token)}` : '';
  // Vite proxies /ws → backend in dev
  return `${proto}://${host}/ws/chat${q}`;
}

export class ChatWebSocketClient {
  private ws: WebSocket | null = null;
  private listeners: WebSocketMessageHandler[] = [];
  private url: string;
  private shouldReconnect = true;
  private reconnectTimer: number | null = null;

  constructor(url?: string) {
    this.url = url || resolveWsUrl();
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.shouldReconnect = true;
    this.url = resolveWsUrl();
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('Chat WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.listeners.forEach((handler) => handler(data));
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    this.ws.onclose = () => {
      console.log('Chat WebSocket disconnected');
      if (this.shouldReconnect) {
        this.reconnectTimer = window.setTimeout(() => this.connect(), 3000);
      }
    };
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  subscribe(handler: WebSocketMessageHandler) {
    this.listeners.push(handler);
    return () => {
      this.listeners = this.listeners.filter((h) => h !== handler);
    };
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}
