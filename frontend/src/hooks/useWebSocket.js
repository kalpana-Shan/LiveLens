import { useRef, useEffect, useCallback } from 'react';

const useWebSocket = (sessionId) => {
  const ws = useRef(null);
  const onCoachingAudioRef = useRef(null);
  const reconnectTimer = useRef(null);

  const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    ws.current = new WebSocket(`${WS_URL}/ws/${sessionId}`);
    ws.current.binaryType = 'arraybuffer';

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };

    ws.current.onmessage = (event) => {
      // Coaching audio comes as binary (PCM chunks)
      if (event.data instanceof ArrayBuffer) {
        if (onCoachingAudioRef.current) {
          onCoachingAudioRef.current(event.data);
        }
      }
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected — reconnecting in 2s...');
      reconnectTimer.current = setTimeout(connect, 2000); // auto-reconnect
    };

    ws.current.onerror = (err) => {
      console.error('WebSocket error:', err);
      ws.current.close();
    };
  }, [sessionId, WS_URL]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  // Send raw PCM audio chunk (ArrayBuffer) to backend
  const sendAudio = useCallback((pcmChunk) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(pcmChunk);
    }
  }, []);

  // Send posture/gaze JSON signal to backend
  const sendSignal = useCallback((json) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(json));
    }
  }, []);

  // Register a callback to receive coaching audio from agent
  const onCoachingAudio = useCallback((callback) => {
    onCoachingAudioRef.current = callback;
  }, []);

  return { sendAudio, sendSignal, onCoachingAudio };
};

export default useWebSocket;