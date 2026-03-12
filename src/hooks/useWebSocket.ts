// src/hooks/useWebSocket.ts
// ──────────────────────────────────────────────────────────────────────────────
// WebSocket hook for real-time workout data streaming via FastAPI.
// ──────────────────────────────────────────────────────────────────────────────

'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface WSMessage {
  type: string;
  [key: string]: unknown;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  lastMessage: WSMessage | null;
  connect: (url?: string) => void;
  disconnect: () => void;
  send: (data: Record<string, unknown>) => void;
}

export function useWebSocket(defaultUrl?: string): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);

  const connect = useCallback((url?: string) => {
    const wsUrl = url || defaultUrl || 'ws://localhost:8000/ws/workout';

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      console.log('[WS] Connected to', wsUrl);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        setLastMessage(msg);
      } catch {
        console.warn('[WS] Failed to parse message');
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('[WS] Disconnected');
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
      setIsConnected(false);
    };

    wsRef.current = ws;
  }, [defaultUrl]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const send = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return { isConnected, lastMessage, connect, disconnect, send };
}
