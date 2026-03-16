// frontend/src/components/modes/InterviewMode.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSilenceDetector } from '../../hooks/useSilenceDetector';

const InterviewMode = () => {
  const videoRef = useRef(null);
  const [error, setError] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  const [metrics, setMetrics] = useState({
    posture: 85,
    eyeContact: 82,
    clarity: 88,
    confidence: 75
  });
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [sessionId] = useState(() => {
    const path = window.location.pathname;
    return path.split('/').pop() || 'session_' + Date.now();
  });

  const videoStreamRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const metricsIntervalRef = useRef(null);
  const lastUserMessageRef = useRef('');
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Initialize silence detector
  const silenceDetector = useSilenceDetector({
    silenceThreshold: 0.02,
    silenceDuration: 1500,
    minSpeechDuration: 500
  });

  // ============ CRITICAL FIX: WebSocket connection ============
  useEffect(() => {
    console.log('🔌 Starting WebSocket connection...');
    
    const connectWebSocket = () => {
      const wsUrl = `ws://localhost:8000/ws/${sessionId}`;
      console.log('🌐 Connecting to:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('✅ WebSocket OPENED - Connection successful!');
        setConnectionStatus('connected');
        setError('');
        
        // Send a test message immediately
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            console.log('📤 Sending test ping...');
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 1000);
      };
      
      // ===== CRITICAL FIX: Message handler =====
      ws.onmessage = (event) => {
        console.log('📩 RAW message received:', event.data);
        
        try {
          const data = JSON.parse(event.data);
          console.log('📦 Parsed message:', data);
          
          // Handle different message types
          if (data.type === 'ai_response') {
            console.log('🤖 AI Response received:', data.content);
            
            // FORCE UI UPDATE - add to conversation
            const newMessage = { 
              role: 'ai', 
              content: data.content || 'No response content'
            };
            
            setConversation(prev => {
              const updated = [...prev, newMessage];
              console.log('💬 Updated conversation:', updated);
              return updated;
            });
            
            setAiMessage(data.content);
            setIsProcessing(false);
            
            // Speak the response
            speakText(data.content);
          }
          else if (data.type === 'pong') {
            console.log('🏓 Pong received - connection healthy');
          }
          else if (data.type === 'error') {
            console.error('❌ Server error:', data.message);
            setError(data.message);
          }
          else {
            console.log('📨 Unknown message type:', data.type);
          }
        } catch (e) {
          console.error('❌ Failed to parse message:', e);
          console.log('Raw data:', event.data);
        }
      };
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        console.log('Error details:', JSON.stringify(error));
        setConnectionStatus('failed');
      };
      
      ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        setConnectionStatus('failed');
      };
      
      wsRef.current = ws;
    };
    
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        console.log('🧹 Cleaning up WebSocket');
        wsRef.current.close();
      }
    };
  }, [sessionId]);

  // ============ Speech processing ============
  useEffect(() => {
    silenceDetector.onSpeechStart(() => {
      console.log('🎤 Speech started');
      setIsListening(true);
    });
    
    silenceDetector.onSpeechEnd((duration) => {
      console.log(`⏱️ Speech ended after ${duration}ms`);
      setIsListening(false);
      
      if (transcript && transcript.trim()) {
        console.log('📝 Processing speech:', transcript);
        processUserSpeech(transcript);
      } else {
        console.log('⚠️ No transcript to process');
      }
    });
  }, [silenceDetector, transcript]);

  // ============ Process user speech ============
  const processUserSpeech = async (speechText) => {
    if (!speechText.trim() || isProcessing) {
      console.log('⏭️ Skipping processing:', { text: speechText, isProcessing });
      return;
    }
    
    setIsProcessing(true);
    console.log('🔄 Processing speech:', speechText);
    
    // Add to conversation
    setConversation(prev => [...prev, { role: 'user', content: speechText }]);
    setTranscript('');
    lastUserMessageRef.current = speechText;
    
    // Send to backend
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = {
        type: 'user_message',
        text: speechText,
        metrics: {
          posture: Math.round(metrics.posture || 0),
          eyeContact: Math.round(metrics.eyeContact || 0),
          clarity: Math.round(metrics.clarity || 85),
          confidence: Math.round(metrics.confidence || 75)
        }
      };
      
      console.log('📤 Sending to backend:', message);
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.error('❌ WebSocket not open, state:', wsRef.current?.readyState);
      setConversation(prev => [...prev, { 
        role: 'ai', 
        content: 'Connection lost. Please refresh the page.',
        isError: true 
      }]);
      setIsProcessing(false);
    }
  };

  // ============ Text to speech ============
  const speakText = (text) => {
    if (!synthRef.current || !text) return;
    
    console.log('🔊 Speaking:', text);
    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.lang = 'en-US';
    
    utterance.onstart = () => console.log('🔊 Speech started');
    utterance.onend = () => console.log('🔊 Speech ended');
    utterance.onerror = (e) => console.log('🔊 Speech error:', e.error);
    
    synthRef.current.speak(utterance);
  };

  // ============ Camera initialization ============
  useEffect(() => {
    const initCamera = async () => {
      try {
        console.log('📷 Requesting camera...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        
        videoStreamRef.current = stream;
        setPermissionGranted(true);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setVideoPlaying(true);
          console.log('✅ Camera active');
        }
      } catch (err) {
        console.error('❌ Camera error:', err);
        setError('Please allow camera and microphone access');
      }
    };
    
    initCamera();
    
    return () => {
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // ============ Speech recognition ============
  useEffect(() => {
    if (!permissionGranted) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      
      if (finalTranscript) {
        console.log('📝 Recognized:', finalTranscript);
        setTranscript(finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.log('🎤 Recognition error:', event.error);
    };

    recognition.start();
    recognitionRef.current = recognition;

    return () => recognition.stop();
  }, [permissionGranted]);

  // ============ Metrics simulation ============
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        posture: Math.min(98, Math.max(65, prev.posture + (Math.random() * 4 - 2))),
        eyeContact: Math.min(95, Math.max(60, prev.eyeContact + (Math.random() * 4 - 2))),
        clarity: Math.min(96, Math.max(70, prev.clarity + (Math.random() * 3 - 1.5))),
        confidence: Math.min(94, Math.max(65, prev.confidence + (Math.random() * 4 - 2)))
      }));
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  // ============ UI ============
  if (error) {
    return (
      <div style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}>
        <div style={{ background: 'white', padding: '3rem', borderRadius: '20px', maxWidth: '500px', textAlign: 'center' }}>
          <h2 style={{ color: '#FF6B6B' }}>{error}</h2>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '1rem 2rem',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '30px',
              fontSize: '1rem',
              cursor: 'pointer',
              marginTop: '1rem'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem',
      color: 'white'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem', textAlign: 'center' }}>
          🎯 AI Interview Practice
        </h1>

        {/* Debug Info - REMOVE AFTER FIXING */}
        <div style={{
          background: 'rgba(0,0,0,0.5)',
          padding: '0.5rem',
          borderRadius: '5px',
          marginBottom: '1rem',
          fontSize: '0.8rem',
          fontFamily: 'monospace'
        }}>
          <div>🔌 WebSocket: {connectionStatus}</div>
          <div>💬 Conversation: {conversation.length} messages</div>
          <div>🎤 Listening: {isListening ? 'Yes' : 'No'}</div>
          <div>🤖 Processing: {isProcessing ? 'Yes' : 'No'}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Left Column - Video */}
          <div>
            <div style={{ 
              background: '#000', 
              borderRadius: '20px',
              overflow: 'hidden',
              aspectRatio: '16/9',
              marginBottom: '1rem',
              position: 'relative'
            }}>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                background: isListening ? '#4CAF50' : '#666',
                padding: '0.3rem 0.8rem',
                borderRadius: '15px',
                fontSize: '0.8rem'
              }}>
                {isListening ? '🎤 Listening' : '⚪ Ready'}
              </div>
            </div>

            {/* Metrics */}
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '20px',
              padding: '1.5rem'
            }}>
              <h3 style={{ marginBottom: '1rem' }}>📊 Live Metrics</h3>
              {Object.entries(metrics).map(([key, value]) => (
                <div key={key} style={{ marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{key}</span>
                    <span>{Math.round(value)}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px' }}>
                    <div style={{ width: `${value}%`, height: '100%', background: '#4ECDC4', borderRadius: '3px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Chat */}
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{
                width: '50px',
                height: '50px',
                background: '#4ECDC4',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem'
              }}>
                🤖
              </div>
              <div>
                <h3>AI Interviewer</h3>
                <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                  {connectionStatus === 'connected' ? '🟢 Online' : '🔴 Connecting'}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div style={{ 
              flex: 1,
              maxHeight: '400px',
              overflowY: 'auto',
              marginBottom: '1rem',
              padding: '0.5rem'
            }}>
              {conversation.map((msg, idx) => (
                <div key={idx} style={{
                  marginBottom: '1rem',
                  textAlign: msg.role === 'ai' ? 'left' : 'right'
                }}>
                  <div style={{
                    display: 'inline-block',
                    maxWidth: '80%',
                    padding: '0.8rem 1rem',
                    background: msg.role === 'ai' ? 'rgba(255,255,255,0.2)' : '#4ECDC4',
                    borderRadius: msg.role === 'ai' ? '20px 20px 20px 5px' : '20px 20px 5px 20px'
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div style={{ opacity: 0.7 }}>🤔 Thinking...</div>
              )}
            </div>

            {/* Current transcript */}
            {transcript && (
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                padding: '0.5rem',
                borderRadius: '5px',
                marginBottom: '1rem',
                fontSize: '0.9rem'
              }}>
                🎤 {transcript}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewMode;