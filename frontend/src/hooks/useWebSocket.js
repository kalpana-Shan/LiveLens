import { useState, useCallback, useRef, useEffect } from 'react';

const useWebSocket = (baseUrl, sessionId) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Construct the full WebSocket URL with session ID
  const getFullUrl = useCallback(() => {
    const cleanedBaseUrl = baseUrl.replace(/\/$/, '');
    return `${cleanedBaseUrl}/ws/${sessionId}`;
  }, [baseUrl, sessionId]);

  // Define reconnect FIRST (but it will call connect)
  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    reconnectTimeoutRef.current = setTimeout(() => {
      console.log('Attempting to reconnect...');
      connect(); // This will work now because connect is hoisted
    }, 3000);
  }, []); // Note: No dependency on connect yet

  // Define connect SECOND (it uses reconnect)
  const connect = useCallback(() => {
    if (!sessionId) {
      console.error('No session ID provided');
      setError('No session ID provided');
      return;
    }

    try {
      const fullUrl = getFullUrl();
      console.log('Connecting to WebSocket:', fullUrl);
      wsRef.current = new WebSocket(fullUrl);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
      };
      
      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000) {
          reconnect(); // This now works
        }
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
  }, [sessionId, getFullUrl, reconnect]); // Add reconnect as dependency

  // Now update reconnect to include connect in dependencies
  const reconnectWithConnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    reconnectTimeoutRef.current = setTimeout(() => {
      console.log('Attempting to reconnect...');
      connect();
    }, 3000);
  }, [connect]); // Add connect as dependency

  // Override the original reconnect
  const finalReconnect = reconnectWithConnect;

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
    const audio = new Audio(audioData);
    audio.play().catch(e => console.error('Error playing audio:', e));
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Normal closure');
    }
  }, []);

  // Auto-connect when sessionId and baseUrl are available
  useEffect(() => {
    if (baseUrl && sessionId) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [baseUrl, sessionId, connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    error,
    connect,
    disconnect,
    sendAudio,
    sendSignal,
    onCoachingAudio, // Add this to return
    reconnect: finalReconnect
  };
};

export default useWebSocket;