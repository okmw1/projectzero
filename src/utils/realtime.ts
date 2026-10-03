import { StudentNote, PhotoCard, UserRole, StudentLetter } from '../types';

export type RealtimeEvent =
  | { type: 'NOTE_ADDED'; note: StudentNote }
  | { type: 'NOTE_FLAGGED'; noteId?: string; studentName?: string; reason?: string; timestamp?: number }
  | { type: 'SUBMISSION_BLOCKED'; reason?: string; studentName?: string; target?: string; timestamp?: number }
  | { type: 'NOTE_LIKED'; noteId: string; likes: number }
  | { type: 'NOTE_DELETED'; noteId: string }
  | { type: 'NOTE_COMMENTED'; noteId: string; comment: string; author: string; time: number }
  | { type: 'TEACHER_REPLY'; note: StudentNote }
  | { type: 'LETTER_SENT'; letter?: StudentLetter; letterId?: string; studentName?: string; recipientTeacherName?: string }
  | { type: 'LETTER_UPDATED'; letter: StudentLetter }
  | { type: 'LETTER_REPLIED'; letterId: string; reply: string; author: string; time: number }
  | { type: 'LETTER_DELETED'; letterId: string }
  | { type: 'LETTER_READ'; letterId: string }
  | { type: 'LETTER_BOOKMARKED'; letterId: string; isBookmarked: boolean }
  | { type: 'PHOTO_ADDED'; photo: PhotoCard }
  | { type: 'PHOTO_REMOVED'; photoId: string }
  | { type: 'PRESENCE_UPDATE'; onlineCount: number; timestamp: number }
  | { type: 'USER_JOINED'; name: string; role: UserRole; timestamp: number }
  | { type: 'PING'; timestamp: number }
  | { type: 'PONG'; timestamp: number };

type Listener = (event: RealtimeEvent) => void;

class RealtimeHub {
  private ws: WebSocket | null = null;
  private sse: EventSource | null = null;
  private channel: BroadcastChannel | null = null;
  private listeners: Set<Listener> = new Set();
  private reconnectAttempts = 0;
  private reconnectTimer: any = null;
  private heartbeatInterval: any = null;
  private isConnecting = false;

  constructor() {
    this.initBroadcastChannel();
    this.initServerConnection();
    this.initStorageListener();
    this.initWindowListeners();
  }

  private initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('teachers_day_realtime_hub');
        this.channel.onmessage = (messageEvent) => {
          if (messageEvent.data && typeof messageEvent.data === 'object') {
            this.notifyListeners(messageEvent.data as RealtimeEvent);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel fallback:', err);
      }
    }
  }

  private initStorageListener() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'teachers_day_realtime_event' && e.newValue) {
          try {
            const eventData = JSON.parse(e.newValue);
            this.notifyListeners(eventData);
          } catch {
            // ignore parse errors
          }
        }
      });
    }
  }

  private initWindowListeners() {
    if (typeof window !== 'undefined') {
      // Reconnect immediately when user switches back to tab or device reconnects to internet
      window.addEventListener('online', () => {
        this.reconnectAttempts = 0;
        this.reconnect();
      });
      window.addEventListener('focus', () => {
        if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
          this.reconnect();
        }
      });
    }
  }

  private initServerConnection() {
    if (typeof window === 'undefined') return;
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/realtime`;
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed && parsed.type && parsed.type !== 'CONNECTED' && parsed.type !== 'PONG') {
            this.notifyListeners(parsed as RealtimeEvent);
          }
        } catch {
          // ignore invalid json
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.stopHeartbeat();
        this.scheduleReconnect();
        this.fallbackToSSE();
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
        this.stopHeartbeat();
        this.scheduleReconnect();
        this.fallbackToSSE();
      };
    } catch {
      this.isConnecting = false;
      this.scheduleReconnect();
      this.fallbackToSSE();
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    // Keep connection alive across Cloud Run proxy timeouts (25-second ping interval)
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
        } catch {
          // ignore
        }
      }
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    // Exponential backoff: 1s, 2s, 4s, up to 10s max
    const delay = Math.min(1000 * Math.pow(1.8, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.initServerConnection();
    }, delay);
  }

  public reconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.initServerConnection();
  }

  private fallbackToSSE() {
    if (this.sse || typeof window === 'undefined') return;
    try {
      this.sse = new EventSource('/api/realtime/stream');
      this.sse.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed && parsed.type && parsed.type !== 'CONNECTED' && parsed.type !== 'PONG') {
            this.notifyListeners(parsed as RealtimeEvent);
          }
        } catch {
          // ignore
        }
      };
      this.sse.onerror = () => {
        if (this.sse) {
          this.sse.close();
          this.sse = null;
        }
      };
    } catch {
      // SSE not available
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public broadcast(event: RealtimeEvent) {
    // 1. Notify local in-tab listeners
    this.notifyListeners(event);

    // 2. Broadcast to other browser tabs via BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage(event);
      } catch {
        // ignore
      }
    }

    // 3. Send to server via WebSocket
    let sentViaWs = false;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(event));
        sentViaWs = true;
      } catch {
        sentViaWs = false;
      }
    }

    // 4. HTTP Relay fallback if WebSocket is temporarily closed or reconnecting
    if (!sentViaWs && typeof window !== 'undefined') {
      try {
        fetch('/api/realtime/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        }).catch(() => {});
      } catch {
        // ignore
      }
    }

    // 5. LocalStorage fallback
    try {
      localStorage.setItem(
        'teachers_day_realtime_event',
        JSON.stringify({ ...event, _ts: Date.now() })
      );
    } catch {
      // ignore
    }
  }

  public announceJoin(name: string, role: UserRole = 'student') {
    this.broadcast({
      type: 'USER_JOINED',
      name,
      role,
      timestamp: Date.now(),
    });
  }

  private notifyListeners(event: RealtimeEvent) {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in realtime listener:', err);
      }
    });
  }
}

export const realtimeHub = new RealtimeHub();
