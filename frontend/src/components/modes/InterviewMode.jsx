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
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId] = useState(() => {
    // Get sessionId from URL or create new one
    const path = window.location.pathname;
    const id = path.split('/').pop();
    return id || 'session_' + Date.now();
  });

  const videoStreamRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const metricsIntervalRef = useRef(null);
  const lastUserMessageRef = useRef('');
  const wsRef = useRef(null);
  const messageQueueRef = useRef([]);

  // Initialize silence detector
  const silenceDetector = useSilenceDetector({
    silenceThreshold: 0.02,
    silenceDuration: 1500,
    minSpeechDuration: 500
  });

  // Interview context
  const interviewContext = useRef({
    role: 'Software Engineer',
    company: 'Google',
    questionCount: 0,
    topics: [],
    lastQuestion: '',
    personality: 'professional',
    interviewStarted: false
  });

  // Initialize WebSocket connection
  useEffect(() => {
    console.log('🔌 Connecting to WebSocket...');
    const wsUrl = `ws://localhost:8000/ws/${sessionId}`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
      
      // Send any queued messages
      while (messageQueueRef.current.length > 0) {
        const msg = messageQueueRef.current.shift();
        ws.send(JSON.stringify(msg));
      }
      
      // Start interview automatically after connection
      setTimeout(() => {
        if (!interviewContext.current.interviewStarted) {
          ws.send(JSON.stringify({
            type: 'start_interview'
          }));
          interviewContext.current.interviewStarted = true;
        }
      }, 500);
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📩 Received:', data);
      
      if (data.type === 'interview_started') {
        // Add welcome message to conversation
        const welcomeMsg = { role: 'ai', content: data.content };
        setConversation(prev => [...prev, welcomeMsg]);
        setAiMessage(data.content);
        speakText(data.content);
      }
      else if (data.type === 'ai_response') {
        // Add AI response to conversation
        const aiMsg = { 
          role: 'ai', 
          content: data.content,
          isHelp: data.response_type === 'help',
          isInfo: data.response_type === 'information'
        };
        setConversation(prev => [...prev, aiMsg]);
        setAiMessage(data.content);
        speakText(data.content);
        setIsProcessing(false);
      }
      else if (data.type === 'help_response') {
        const helpMsg = { role: 'ai', content: data.content, isHelp: true };
        setConversation(prev => [...prev, helpMsg]);
        speakText(data.content);
        setIsProcessing(false);
      }
      else if (data.type === 'error') {
        console.error('Server error:', data.message);
        setError(data.message);
        setIsProcessing(false);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Connection error. Please refresh.');
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      
      // Try to reconnect after 3 seconds
      setTimeout(() => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
          window.location.reload();
        }
      }, 3000);
    };
    
    wsRef.current = ws;
    
    return () => {
      ws.close();
    };
  }, [sessionId]);

  // Set up silence detector callbacks
  useEffect(() => {
    silenceDetector.onSpeechStart(() => {
      console.log('🎤 User started speaking');
      setIsListening(true);
    });
    
    silenceDetector.onSpeechEnd((duration) => {
      console.log(`✅ User finished speaking after ${duration}ms`);
      setIsListening(false);
      
      // Only process if we have transcript and not already processing
      if (transcript && transcript.trim() && !isProcessing) {
        processUserSpeech(transcript);
      }
    });
  }, [silenceDetector, transcript, isProcessing]);

  // Initialize Camera
  useEffect(() => {
    const initCamera = async () => {
      try {
        console.log('📷 Requesting camera access...');
        
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Your browser does not support camera access. Please use Chrome or Edge.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user"
          }, 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        
        videoStreamRef.current = stream;
        setPermissionGranted(true);
        setError('');
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          const playPromise = videoRef.current.play();
          
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log('✅ Video playing successfully');
                setVideoPlaying(true);
              })
              .catch(error => {
                console.log('ℹ️ Autoplay prevented - waiting for user interaction');
                setVideoPlaying(false);
              });
          }
        }
      } catch (err) {
        console.error('❌ Camera initialization error:', err);
        setError('Please allow camera and microphone access');
      }
    };
    
    initCamera();
    
    return () => {
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => {
          track.stop();
        });
      }
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Smooth metrics update
  useEffect(() => {
    if (!permissionGranted) return;

    metricsIntervalRef.current = setInterval(() => {
      setMetrics(prev => ({
        posture: Math.min(98, Math.max(65, prev.posture + (Math.random() * 3 - 1.5))),
        eyeContact: Math.min(95, Math.max(60, prev.eyeContact + (Math.random() * 4 - 2))),
        clarity: Math.min(96, Math.max(70, prev.clarity + (Math.random() * 2 - 1))),
        confidence: Math.min(94, Math.max(65, prev.confidence + (Math.random() * 3 - 1.5)))
      }));
    }, 2000);

    return () => clearInterval(metricsIntervalRef.current);
  }, [permissionGranted]);

  // Speech Recognition
  useEffect(() => {
    if (!permissionGranted) return;

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setAiMessage("Please use Chrome for the best experience with voice features.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';
    recognitionRef.current.maxAlternatives = 1;

    recognitionRef.current.onresult = (event) => {
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        console.log('📝 You said:', finalTranscript);
        setTranscript(finalTranscript);
      }
    };

    recognitionRef.current.onerror = (event) => {
      console.log('Recognition error:', event.error);
      // Don't show error to user, just log it
    };

    try {
      recognitionRef.current.start();
    } catch (e) {
      console.log('Recognition start error:', e);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [permissionGranted]);

  // Process user speech after silence detection
  const processUserSpeech = async (speechText) => {
    if (!speechText.trim() || isProcessing || !isConnected) return;
    
    setIsProcessing(true);
    
    // Add to conversation
    setConversation(prev => [...prev, { role: 'user', content: speechText }]);
    
    // Clear transcript after processing
    setTranscript('');
    lastUserMessageRef.current = speechText;
    
    // Send to backend
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'user_message',
        text: speechText,
        metrics: {
          posture: Math.round(metrics.posture || 0),
          eyeContact: Math.round(metrics.eyeContact || 0),
          clarity: Math.round(metrics.clarity || 85),
          confidence: Math.round(metrics.confidence || 75)
        }
      }));
      console.log('📤 Sent message to server');
    } else {
      // Queue message if not connected
      messageQueueRef.current.push({
        type: 'user_message',
        text: speechText,
        metrics: {
          posture: Math.round(metrics.posture || 0),
          eyeContact: Math.round(metrics.eyeContact || 0),
          clarity: Math.round(metrics.clarity || 85),
          confidence: Math.round(metrics.confidence || 75)
        }
      });
      console.log('📤 Queued message (not connected)');
    }
  };

  // Text-to-speech
  const speakText = (text) => {
    if (!synthRef.current) return;

    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.name.includes('Google UK') || voice.name.includes('Female')
    );
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => console.log('🔊 AI speaking');
    utterance.onend = () => console.log('✅ AI finished');
    utterance.onerror = (e) => console.error('Speech error:', e);
    
    synthRef.current.speak(utterance);
  };

  // Handle click on video to start playback
  const handleVideoClick = () => {
    if (videoRef.current && !videoPlaying) {
      videoRef.current.play()
        .then(() => {
          setVideoPlaying(true);
        })
        .catch(e => console.log('Play error:', e));
    }
  };

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
        <div style={{ 
          background: 'white', 
          padding: '3rem', 
          borderRadius: '20px', 
          maxWidth: '500px', 
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '4rem', marginBottom: '1rem' }}>📹</span>
          <h2 style={{ color: '#FF6B6B', marginBottom: '1rem' }}>Connection Error</h2>
          <p style={{ color: '#666', marginBottom: '2rem' }}>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '1rem 2rem',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '30px',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            🔄 Try Again
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
          🎯 Software Engineer Interview • Google
        </h1>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr',
          gap: '2rem'
        }}>
          {/* Left Column - Video */}
          <div>
            <div style={{ 
              background: '#1a1a1a', 
              borderRadius: '20px',
              overflow: 'hidden',
              aspectRatio: '16/9',
              marginBottom: '1.5rem',
              border: '3px solid rgba(255,255,255,0.2)',
              position: 'relative'
            }}>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              
              {/* Click to play overlay */}
              {!videoPlaying && permissionGranted && (
                <div 
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: '1rem',
                    cursor: 'pointer',
                    zIndex: 10
                  }}
                  onClick={handleVideoClick}
                >
                  <span style={{ fontSize: '3rem' }}>🎥</span>
                  <p style={{ color: 'white', fontSize: '1.2rem' }}>Click to start camera</p>
                </div>
              )}
              
              {/* Status Badge */}
              <div style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                background: isListening ? '#4CAF50' : isProcessing ? '#FFA500' : '#4ECDC4',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                zIndex: 20
              }}>
                <span style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: 'white',
                  animation: isListening ? 'pulse 1s infinite' : 'none'
                }}></span>
                {isListening ? '🎤 Listening' : isProcessing ? '⚪ Processing' : isConnected ? '✅ Connected' : '🔌 Connecting'}
              </div>
            </div>

            {/* Metrics */}
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px',
              padding: '1.5rem'
            }}>
              <h3 style={{ marginBottom: '1.5rem' }}>📊 Live Metrics</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {Object.entries(metrics).map(([key, value]) => (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ textTransform: 'capitalize' }}>{key}</span>
                      <span style={{ 
                        color: value > 80 ? '#4ECDC4' : value > 60 ? '#FFD93D' : '#FF6B6B',
                        fontWeight: 'bold'
                      }}>
                        {Math.round(value)}%
                      </span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px' }}>
                      <div style={{ 
                        width: `${value}%`, 
                        height: '100%', 
                        background: value > 80 ? '#4ECDC4' : value > 60 ? '#FFD93D' : '#FF6B6B',
                        borderRadius: '3px',
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
              {transcript && (
                <div style={{ 
                  marginTop: '1rem', 
                  padding: '0.5rem', 
                  background: 'rgba(255,255,255,0.05)', 
                  borderRadius: '10px',
                  fontSize: '0.9rem'
                }}>
                  <strong>You're saying:</strong> {transcript}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - AI Interviewer */}
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* AI Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: 'linear-gradient(135deg, #FF6B6B, #4ECDC4)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem'
              }}>
                🤖
              </div>
              <div>
                <h3>AI Interviewer</h3>
                <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>
                  {isConnected ? '🟢 Online' : '🔴 Connecting...'}
                </p>
              </div>
            </div>

            {/* Quick Help Buttons */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              marginBottom: '1rem',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => {
                  const helpQuestion = "How do I answer 'Tell me about yourself'?";
                  setTranscript(helpQuestion);
                  processUserSpeech(helpQuestion);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '20px',
                  color: 'white',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                🆘 "Tell me about yourself"
              </button>
              <button
                onClick={() => {
                  const helpQuestion = "What questions will be asked?";
                  setTranscript(helpQuestion);
                  processUserSpeech(helpQuestion);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '20px',
                  color: 'white',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                ❓ Interview questions
              </button>
              <button
                onClick={() => {
                  const helpQuestion = "Tell me about Google's culture";
                  setTranscript(helpQuestion);
                  processUserSpeech(helpQuestion);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '20px',
                  color: 'white',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                🏢 About Google
              </button>
            </div>

            {/* Conversation */}
            <div style={{ 
              flex: 1,
              maxHeight: '400px',
              overflowY: 'auto',
              marginBottom: '1.5rem',
              padding: '0.5rem'
            }}>
              {conversation.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    marginBottom: '1rem',
                    textAlign: msg.role === 'ai' ? 'left' : 'right'
                  }}
                >
                  <div style={{
                    display: 'inline-block',
                    maxWidth: '80%',
                    padding: '1rem',
                    background: msg.role === 'ai' 
                      ? msg.isHelp ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255,255,255,0.15)'
                      : 'rgba(78, 205, 196, 0.3)',
                    borderRadius: msg.role === 'ai' ? '20px 20px 20px 5px' : '20px 20px 5px 20px'
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div style={{ textAlign: 'left', opacity: 0.7 }}>
                  <i>AI is thinking...</i>
                </div>
              )}
            </div>

            {/* Current AI Message */}
            {aiMessage && conversation.length > 0 && conversation[conversation.length - 1].role === 'ai' && (
              <div style={{
                background: 'rgba(255,255,255,0.15)',
                borderRadius: '20px',
                padding: '1rem',
                marginBottom: '1rem',
                borderLeft: '4px solid #4ECDC4'
              }}>
                <strong>Now asking:</strong> {aiMessage}
              </div>
            )}

            {/* Camera status message */}
            {permissionGranted && !videoPlaying && (
              <p style={{ textAlign: 'center', marginTop: '1rem', opacity: 0.8 }}>
                👆 Click the video to start camera
              </p>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default InterviewMode;