export type WebSocketMessageHandler = (data: any) => void;

export class ChatWebSocketClient {
  private ws: WebSocket | null = null;
  private listeners: WebSocketMessageHandler[] = [];
  private url: string;

  constructor(url: string = 'ws://localhost:8000/ws/chat') {
    this.url = url;
  }

  connect() {
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
      console.log('Chat WebSocket disconnected, reconnecting in 3s...');
      setTimeout(() => this.connect(), 3000);
    };
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
