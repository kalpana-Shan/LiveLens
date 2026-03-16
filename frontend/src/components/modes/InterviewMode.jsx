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
  const [sendMessage, setSendMessage] = useState(null);

  const videoStreamRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const metricsIntervalRef = useRef(null);
  const lastUserMessageRef = useRef('');
  const wsRef = useRef(null);

  // Initialize silence detector
  const silenceDetector = useSilenceDetector({
    silenceThreshold: 0.02,
    silenceDuration: 1500, // 1.5 seconds of silence = end of speech
    minSpeechDuration: 500  // Must speak for at least 0.5 seconds
  });

  // Interview context
  const interviewContext = useRef({
    role: 'Software Engineer',
    company: 'Google',
    questionCount: 0,
    topics: [],
    lastQuestion: '',
    personality: 'professional'
  });

  // Initialize WebSocket connection
  useEffect(() => {
    const sessionId = window.location.pathname.split('/').pop();
    const ws = new WebSocket(`ws://localhost:8000/ws/${sessionId}`);
    
    ws.onopen = () => {
      console.log('✅ WebSocket connected');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📩 Received:', data);
      
      if (data.type === 'ai_response') {
        // Add AI response to conversation
        setConversation(prev => [...prev, { role: 'ai', content: data.content }]);
        setAiMessage(data.content);
        speakText(data.content);
      } else if (data.type === 'help_response') {
        // Show help message
        setConversation(prev => [...prev, { role: 'ai', content: data.content, isHelp: true }]);
        speakText(data.content);
      } else if (data.type === 'error') {
        console.error('Server error:', data.message);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    wsRef.current = ws;
    setSendMessage(() => (msg) => ws.send(JSON.stringify(msg)));
    
    return () => {
      ws.close();
    };
  }, []);

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
      if (transcript && !isProcessing) {
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
            facingMode: "user",
            frameRate: { ideal: 30 }
          }, 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        }).catch(err => {
          console.error('Camera error type:', err.name);
          if (err.name === 'NotAllowedError') {
            throw new Error('Camera access denied. Please click the camera icon in the address bar and allow access, then refresh.');
          } else if (err.name === 'NotFoundError') {
            throw new Error('No camera found on your device.');
          } else if (err.name === 'NotReadableError') {
            throw new Error('Camera is already in use by another app. Please close other apps using your camera.');
          } else if (err.name === 'OverconstrainedError') {
            throw new Error('Camera cannot meet the requirements. Try a different camera.');
          } else {
            throw new Error('Could not access camera: ' + (err.message || 'Unknown error'));
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
                
                // Start interview after camera is working
                setTimeout(() => {
                  const welcome = "Hi there! I'm your AI interviewer for today's Software Engineer position at Google. Why don't you start by telling me a bit about yourself and your experience?";
                  setAiMessage(welcome);
                  setConversation([{ role: 'ai', content: welcome }]);
                  speakText(welcome);
                }, 1000);
              })
              .catch(error => {
                console.log('ℹ️ Autoplay prevented - waiting for user interaction');
                setVideoPlaying(false);
              });
          }
        }
      } catch (err) {
        console.error('❌ Camera initialization error:', err);
        setError(err.message || 'Please allow camera and microphone access');
      }
    };
    
    initCamera();
    
    return () => {
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('Stopped track:', track.kind);
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

    recognitionRef.current.onresult = (event) => {
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        console.log('📝 Interim transcript:', finalTranscript);
        setTranscript(finalTranscript);
        
        // Update metrics based on speech
        updateMetricsFromSpeech(finalTranscript);
      }
    };

    recognitionRef.current.onerror = (event) => {
      console.log('Recognition error:', event.error);
    };

    try {
      recognitionRef.current.start();
    } catch (e) {}

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [permissionGranted]);

  // Process user speech after silence detection
  const processUserSpeech = async (speechText) => {
    if (!speechText.trim() || isProcessing) return;
    
    setIsProcessing(true);
    
    // Add to conversation
    setConversation(prev => [...prev, { role: 'user', content: speechText }]);
    
    // Clear transcript after processing
    setTranscript('');
    lastUserMessageRef.current = speechText;
    
    // Send to backend
    if (sendMessage) {
      sendMessage({
        type: 'user_message',
        text: speechText,
        metrics: {
          posture: Math.round(metrics.posture || 0),
          eyeContact: Math.round(metrics.eyeContact || 0),
          clarity: Math.round(metrics.clarity || 85),
          confidence: Math.round(metrics.confidence || 75)
        }
      });
    }
    
    setIsProcessing(false);
  };

  // Update metrics based on speech patterns
  const updateMetricsFromSpeech = (speech) => {
    const words = speech.split(' ');
    const fillerWords = ['um', 'uh', 'like', 'actually', 'basically', 'you know'];
    const fillerCount = words.filter(w => fillerWords.includes(w.toLowerCase())).length;
    
    setMetrics(prev => ({
      posture: prev.posture + (Math.random() * 2 - 1),
      eyeContact: prev.eyeContact + (fillerCount > 2 ? -2 : 1),
      clarity: prev.clarity + (words.length > 20 ? 1 : -1),
      confidence: prev.confidence + (fillerCount === 0 ? 2 : -1)
    }));
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
    const preferredVoice = voices.find(voice => voice.name.includes('Google UK') || voice.name.includes('Female'));
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onend = () => console.log('✅ AI finished');
    synthRef.current.speak(utterance);
  };

  // Handle click on video to start playback
  const handleVideoClick = () => {
    if (videoRef.current && !videoPlaying) {
      videoRef.current.play()
        .then(() => {
          setVideoPlaying(true);
          if (conversation.length === 0) {
            const welcome = "Hi there! I'm your AI interviewer for today's Software Engineer position at Google. Why don't you start by telling me a bit about yourself and your experience?";
            setAiMessage(welcome);
            setConversation([{ role: 'ai', content: welcome }]);
            speakText(welcome);
          }
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
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
        }}>
          <span style={{ fontSize: '4rem', display: 'block', marginBottom: '1rem' }}>📹</span>
          <h2 style={{ color: '#FF6B6B', marginBottom: '1rem' }}>Camera Access Required</h2>
          <p style={{ color: '#666', marginBottom: '2rem', lineHeight: '1.6' }}>
            {error}
          </p>
          <div style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '10px', marginBottom: '2rem', textAlign: 'left' }}>
            <p style={{ color: '#333', marginBottom: '0.5rem' }}><strong>🔍 Troubleshooting steps:</strong></p>
            <ul style={{ color: '#666', paddingLeft: '1.5rem' }}>
              <li>1. Click the camera icon in your browser's address bar</li>
              <li>2. Select "Allow" for camera and microphone</li>
              <li>3. Refresh the page</li>
              <li>4. If using Chrome, try Edge browser</li>
            </ul>
          </div>
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
              fontWeight: 'bold',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
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
                background: isListening ? '#4CAF50' : '#FFA500',
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
                {isListening ? '🎤 Listening' : isProcessing ? '⚪ Processing...' : '⚪ Ready'}
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
                <div style={{ marginTop: '1rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                  <small>Speaking: {transcript}</small>
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
                <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>Google • Software Engineer</p>
              </div>
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