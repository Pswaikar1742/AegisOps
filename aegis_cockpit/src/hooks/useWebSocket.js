import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Custom React hook for WebSocket connection to AegisOps backend.
 * Manages connection, reconnection, and message dispatching.
 */
export function useWebSocket(url) {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [messages, setMessages] = useState([]);
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      console.log('[WS] Connected to AegisOps');
    };

    ws.onmessage = (event) => {
      try {
        const frame = JSON.parse(event.data);
        setLastMessage(frame);
        setMessages((prev) => [...prev.slice(-500), frame]); // Keep last 500
      } catch (e) {
        console.warn('[WS] Parse error:', e);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      console.log('[WS] Disconnected, reconnecting in 3s…');
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [url]);

  useEffect(() => {
    connect();
    // Keep-alive ping every 25s
    const ping = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send('ping');
      }
    }, 25000);

    return () => {
      clearInterval(ping);
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }, []);

  return { connected, lastMessage, messages, send };
}

/**
 * Filter messages by frame type.
 */
export function useFilteredMessages(messages, types) {
  return messages.filter((m) => types.includes(m.type));
}
