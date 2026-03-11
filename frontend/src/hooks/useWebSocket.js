import { useState, useCallback, useRef, useEffect } from 'react';

const useWebSocket = (url) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Connect to WebSocket
  const connect = useCallback(() => {
    try {
      wsRef.current = new WebSocket(url);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
      };
      
      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
      };
      
      wsRef.current.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          
          // Handle coaching audio
          if (data.type === 'coaching_audio') {
            onCoachingAudio(data.audio);
          }
        } catch (e) {
          console.error('Error parsing message:', e);
        }
      };
    } catch (err) {
      console.error('Connection error:', err);
      setError(err.message);
    }
  }, [url]);

  // Send audio data
  const sendAudio = useCallback((audioData) => {
    if (wsRef.current && isConnected) {
      const message = JSON.stringify({
        type: 'audio',
        data: audioData
      });
      wsRef.current.send(message);
    } else {
      console.warn('WebSocket not connected');
    }
  }, [isConnected]);

  // Send signal (for WebRTC)
  const sendSignal = useCallback((signal) => {
    if (wsRef.current && isConnected) {
      const message = JSON.stringify({
        type: 'signal',
        data: signal
      });
      wsRef.current.send(message);
    }
  }, [isConnected]);

  // Handle coaching audio
  const onCoachingAudio = useCallback((audioData) => {
    // Play coaching audio
    const audio = new Audio(audioData);
    audio.play().catch(e => console.error('Error playing audio:', e));
  }, []);

  // Reconnect
  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    reconnectTimeoutRef.current = setTimeout(() => {
      console.log('Attempting to reconnect...');
      connect();
    }, 3000); // Try to reconnect after 3 seconds
  }, [connect]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    lastMessage,
    error,
    connect,
    disconnect,
    sendAudio,
    sendSignal,
    reconnect
  };
};

export default useWebSocket;