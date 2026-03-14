// frontend/src/hooks/useWebSocket.js
import { useEffect, useRef, useState, useCallback } from 'react';

export const useWebSocket = (sessionId) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'ws://localhost:8000';
      const ws = new WebSocket(`${backendUrl}/ws/${sessionId}`);
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setMessages((prev) => [...prev, data]);
          
          // Handle different message types
          if (data.type === 'interview_started') {
            console.log('📝 Interview started:', data);
          } else if (data.type === 'interview_feedback') {
            console.log('💬 Feedback received');
          } else if (data.type === 'interview_complete') {
            console.log('🏁 Interview complete');
          }
        } catch (e) {
          console.error('Error parsing message:', e);
        }
      };

      ws.onerror = (event) => {
        console.error('❌ WebSocket error:', event);
        setError('WebSocket connection error');
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setIsConnected(false);
        
        // Try to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          console.log(`🔄 Reconnecting... Attempt ${reconnectAttempts.current}`);
          setTimeout(connect, 2000 * reconnectAttempts.current);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Failed to connect WebSocket:', err);
      setError(err.message);
    }
  }, [sessionId]);

  useEffect(() => {
    connect();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    } else {
      console.warn('WebSocket not connected');
      return false;
    }
  }, []);

  const on = useCallback((eventType, callback) => {
    // Simple event emitter pattern
    const messageHandler = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === eventType) {
          callback(data.payload || data);
        }
      } catch (e) {}
    };
    
    if (wsRef.current) {
      wsRef.current.addEventListener('message', messageHandler);
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.removeEventListener('message', messageHandler);
      }
    };
  }, []);

  return {
    isConnected,
    messages,
    error,
    sendMessage,
    on,
    ws: wsRef.current
  };
};