// frontend/src/components/modes/InterviewMode.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';

const InterviewMode = () => {
  const videoRef = useRef(null);
  const [error, setError] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [aiMessage, setAiMessage] = useState('Welcome to your interview! I\'m your AI interviewer. Please tell me about yourself and your experience.');
  const [userMessage, setUserMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [metrics, setMetrics] = useState({
    posture: 0,
    eyeContact: 0,
    clarity: 0,
    confidence: 0
  });

  const recognitionRef = useRef(null);
  const speechSynthesisRef = useRef(window.speechSynthesis);
  const videoStreamRef = useRef(null);
  const animationRef = useRef(null);

  // Initialize camera
  useEffect(() => {
    const initCamera = async () => {
      try {
        console.log('📷 Requesting camera access...');
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
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        
        setPermissionGranted(true);
        setError('');
        console.log('✅ Camera access granted');

        // Start simulating metrics (replace with actual MediaPipe later)
        startMetricsSimulation();

      } catch (err) {
        console.error('❌ Camera error:', err);
        setError('Please allow camera and microphone access to use LiveLens');
      }
    };
    
    initCamera();
    
    return () => {
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Simulate metrics (replace with actual MediaPipe later)
  const startMetricsSimulation = () => {
    const updateMetrics = () => {
      setMetrics({
        posture: 70 + Math.floor(Math.random() * 25),
        eyeContact: 65 + Math.floor(Math.random() * 30),
        clarity: 75 + Math.floor(Math.random() * 20),
        confidence: 70 + Math.floor(Math.random() * 25)
      });
      animationRef.current = requestAnimationFrame(updateMetrics);
    };
    animationRef.current = requestAnimationFrame(updateMetrics);
  };

  // Initialize speech recognition
  useEffect(() => {
    if (!permissionGranted) return;

    // Check if browser supports speech recognition
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setAiMessage("Your browser doesn't support speech recognition. Please use Chrome or Edge.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => {
      console.log('🎤 Listening started');
      setIsListening(true);
    };

    recognitionRef.current.onend = () => {
      console.log('🎤 Listening ended');
      setIsListening(false);
    };

    recognitionRef.current.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setUserMessage(finalTranscript);
        setTranscript(prev => prev + ' ' + finalTranscript);
        
        // When user finishes speaking, AI responds
        if (finalTranscript.length > 10) {
          setTimeout(() => {
            generateAIResponse(finalTranscript);
          }, 1000);
        }
      }
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
    };

    // Start listening automatically
    try {
      recognitionRef.current.start();
    } catch (e) {
      console.log('Recognition already started');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [permissionGranted]);

  // AI Response Generator
  const generateAIResponse = (userSpeech) => {
    // Simple AI responses based on user input
    let response = '';
    
    if (userSpeech.toLowerCase().includes('experience') || userSpeech.toLowerCase().includes('worked')) {
      response = "That's great experience! Can you tell me about a specific challenge you faced in that role and how you overcame it?";
    } else if (userSpeech.toLowerCase().includes('skill') || userSpeech.toLowerCase().includes('good at')) {
      response = "Excellent! How do you apply these skills in a team environment?";
    } else if (userSpeech.toLowerCase().includes('project')) {
      response = "Interesting project! What was your specific role and contribution?";
    } else if (userSpeech.toLowerCase().includes('why')) {
      response = "That's a good point. Can you elaborate more on your motivation?";
    } else {
      response = "Thank you for sharing. Based on your response, I can see good communication skills. However, I notice your eye contact could be improved. Try to look directly at the camera. Now, tell me about a time you demonstrated leadership.";
    }

    setAiMessage(response);
    
    // Speak the response
    speakText(response);

    // Update metrics based on response
    setMetrics(prev => ({
      ...prev,
      clarity: Math.min(100, prev.clarity + 2),
      confidence: Math.min(100, prev.confidence + 1)
    }));
  };

  // Text-to-speech function
  const speakText = (text) => {
    if (!speechSynthesisRef.current) return;

    // Stop any ongoing speech
    speechSynthesisRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.voice = speechSynthesisRef.current.getVoices().find(voice => 
      voice.name.includes('Google') || voice.name.includes('Female')
    );

    speechSynthesisRef.current.speak(utterance);
  };

  // Toggle listening
  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.log('Recognition start error:', e);
      }
    }
  };

  if (error) {
    return (
      <div style={{ 
        padding: '2rem', 
        background: 'linear-gradient(135deg, #FF6B6B, #4ECDC4)',
        minHeight: '100vh',
        color: 'white',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ background: 'white', padding: '3rem', borderRadius: '20px', color: '#333', maxWidth: '500px' }}>
          <h2 style={{ color: '#FF6B6B', marginBottom: '1rem' }}>⚠️ {error}</h2>
          <p style={{ marginBottom: '2rem' }}>Please allow camera and microphone access to continue</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              background: '#FF6B6B',
              color: 'white',
              border: 'none',
              borderRadius: '30px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Try Again
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

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr',
          gap: '2rem'
        }}>
          {/* Left Column - Video & Metrics */}
          <div>
            {/* Video Section */}
            <div style={{ 
              background: '#1a1a1a', 
              borderRadius: '20px',
              overflow: 'hidden',
              aspectRatio: '16/9',
              marginBottom: '1.5rem',
              position: 'relative',
              border: '3px solid rgba(255,255,255,0.2)'
            }}>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              
              {/* Live Indicator */}
              <div style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                background: isListening ? '#4CAF50' : '#FF6B6B',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.9rem',
                fontWeight: 'bold'
              }}>
                {isListening ? '🎤 Listening...' : '⚪ AI Ready'}
              </div>
            </div>

            {/* Metrics Dashboard */}
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px',
              padding: '1.5rem',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <h3 style={{ marginBottom: '1rem' }}>Live Performance Metrics</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>Posture</span>
                    <span style={{ color: '#4ECDC4', fontWeight: 'bold' }}>{metrics.posture}%</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px' }}>
                    <div style={{ width: `${metrics.posture}%`, height: '100%', background: '#4ECDC4', borderRadius: '4px' }}></div>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>Eye Contact</span>
                    <span style={{ color: '#FFD93D', fontWeight: 'bold' }}>{metrics.eyeContact}%</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px' }}>
                    <div style={{ width: `${metrics.eyeContact}%`, height: '100%', background: '#FFD93D', borderRadius: '4px' }}></div>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>Clarity</span>
                    <span style={{ color: '#6BCB77', fontWeight: 'bold' }}>{metrics.clarity}%</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px' }}>
                    <div style={{ width: `${metrics.clarity}%`, height: '100%', background: '#6BCB77', borderRadius: '4px' }}></div>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>Confidence</span>
                    <span style={{ color: '#FF6B6B', fontWeight: 'bold' }}>{metrics.confidence}%</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px' }}>
                    <div style={{ width: `${metrics.confidence}%`, height: '100%', background: '#FF6B6B', borderRadius: '4px' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - AI Interviewer Chat */}
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '2rem',
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex',
            flexDirection: 'column',
            height: 'fit-content'
          }}>
            {/* AI Avatar */}
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
                <h3 style={{ marginBottom: '0.25rem' }}>AI Interviewer</h3>
                <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>Google • Software Engineer Interview</p>
              </div>
            </div>

            {/* AI Message Bubble */}
            <div style={{
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '20px 20px 20px 5px',
              padding: '1.5rem',
              marginBottom: '2rem',
              fontSize: '1.1rem',
              lineHeight: '1.6',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              {aiMessage}
            </div>

            {/* User Transcript */}
            {userMessage && (
              <div style={{
                background: 'rgba(78, 205, 196, 0.2)',
                borderRadius: '20px 20px 5px 20px',
                padding: '1rem',
                marginBottom: '1rem',
                alignSelf: 'flex-end',
                maxWidth: '80%',
                marginLeft: 'auto'
              }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.5rem' }}>You said:</div>
                {userMessage}
              </div>
            )}

            {/* Live Transcript */}
            {transcript && (
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '10px',
                padding: '1rem',
                marginTop: '1rem',
                fontSize: '0.9rem',
                opacity: 0.7,
                maxHeight: '100px',
                overflowY: 'auto'
              }}>
                <div style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>Live transcript:</div>
                {transcript}
              </div>
            )}

            {/* Controls */}
            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
              <button
                onClick={toggleListening}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: isListening ? '#FF6B6B' : '#4ECDC4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '30px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                {isListening ? '🔴 Stop Listening' : '🎤 Start Speaking'}
              </button>
              <button
                onClick={() => {
                  setTranscript('');
                  setUserMessage('');
                  setAiMessage('Welcome to your interview! I\'m your AI interviewer. Please tell me about yourself and your experience.');
                }}
                style={{
                  padding: '1rem 2rem',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '30px',
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                Reset
              </button>
            </div>

            {/* Tips */}
            <div style={{
              marginTop: '2rem',
              padding: '1rem',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '10px',
              fontSize: '0.9rem'
            }}>
              <strong>💡 Tips:</strong>
              <ul style={{ marginTop: '0.5rem', listStyle: 'none' }}>
                <li>• Speak clearly and at a moderate pace</li>
                <li>• Look directly at the camera</li>
                <li>• Use the STAR method for behavioral questions</li>
                <li>• Pause briefly between sentences</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewMode;