// frontend/src/components/modes/InterviewMode.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';

const InterviewMode = () => {
  const videoRef = useRef(null);
  const [error, setError] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [aiMessage, setAiMessage] = useState('Welcome to your interview! I\'m your AI interviewer. Please tell me about yourself and your experience.');
  const [userMessage, setUserMessage] = useState('');
  const [transcript, setTranscript] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [metrics, setMetrics] = useState({
    posture: 85,
    eyeContact: 82,
    clarity: 88,
    confidence: 75,
    fillerWords: 0,
    pace: 'Moderate'
  });

  const videoStreamRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const animationRef = useRef(null);
  const mediaPipeInitialized = useRef(false);

  // Initialize Camera - FIXED VERSION
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
        
        // Important: Set srcObject and wait for loadedmetadata
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Wait for video to be ready
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play()
              .then(() => {
                console.log('✅ Video playing');
                setPermissionGranted(true);
                setError('');
              })
              .catch(err => {
                console.error('❌ Video play error:', err);
                setError('Could not start video');
              });
          };
        }
        
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

  // Simulate accurate metrics (replace with actual MediaPipe later)
  useEffect(() => {
    if (!permissionGranted) return;

    const updateMetrics = () => {
      setMetrics(prev => ({
        posture: Math.min(95, Math.max(70, prev.posture + (Math.random() * 4 - 2))),
        eyeContact: Math.min(92, Math.max(65, prev.eyeContact + (Math.random() * 5 - 2.5))),
        clarity: Math.min(94, Math.max(75, prev.clarity + (Math.random() * 3 - 1.5))),
        confidence: Math.min(90, Math.max(65, prev.confidence + (Math.random() * 4 - 2))),
        fillerWords: Math.floor(Math.random() * 3),
        pace: Math.random() > 0.7 ? 'Fast' : Math.random() > 0.4 ? 'Moderate' : 'Slow'
      }));

      // Generate suggestions based on metrics
      generateSuggestions();
      
      animationRef.current = requestAnimationFrame(updateMetrics);
    };

    animationRef.current = requestAnimationFrame(updateMetrics);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [permissionGranted]);

  // Generate live suggestions
  const generateSuggestions = useCallback(() => {
    const newSuggestions = [];
    
    if (metrics.eyeContact < 75) {
      newSuggestions.push('👀 Look directly at the camera lens');
    }
    if (metrics.posture < 75) {
      newSuggestions.push('🧍 Sit up straight - shoulders back');
    }
    if (metrics.clarity < 80) {
      newSuggestions.push('🎤 Speak more clearly and articulate');
    }
    if (metrics.confidence < 70) {
      newSuggestions.push('💪 Show confidence - avoid filler words');
    }
    if (metrics.fillerWords > 2) {
      newSuggestions.push('🔇 Try to reduce "um" and "like"');
    }
    if (metrics.pace === 'Fast') {
      newSuggestions.push('⏱️ Slow down your speaking pace');
    }
    if (metrics.pace === 'Slow') {
      newSuggestions.push('⏱️ Pick up your pace slightly');
    }
    
    setSuggestions(newSuggestions.slice(0, 3)); // Show top 3 suggestions
  }, [metrics]);

  // Initialize speech recognition - FIXED VERSION
  useEffect(() => {
    if (!permissionGranted) return;

    // Check browser support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setAiMessage("Your browser doesn't support speech recognition. Please use Chrome.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';
    recognitionRef.current.maxAlternatives = 1;

    recognitionRef.current.onstart = () => {
      console.log('🎤 Listening started');
      setIsListening(true);
    };

    recognitionRef.current.onend = () => {
      console.log('🎤 Listening ended - restarting...');
      setIsListening(false);
      
      // Restart listening automatically
      if (permissionGranted) {
        setTimeout(() => {
          try {
            recognitionRef.current.start();
          } catch (e) {}
        }, 100);
      }
    };

    recognitionRef.current.onresult = (event) => {
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        }
      }

      if (finalTranscript) {
        console.log('✅ Speech detected:', finalTranscript);
        setUserMessage(finalTranscript);
        setTranscript(prev => prev + ' ' + finalTranscript);
        
        // Check for filler words
        const fillerCount = (finalTranscript.match(/\b(um|uh|like|actually|basically)\b/gi) || []).length;
        setMetrics(prev => ({
          ...prev,
          fillerWords: prev.fillerWords + fillerCount
        }));

        // Generate AI response after user speaks
        setTimeout(() => {
          generateAIResponse(finalTranscript);
        }, 800);
      }
    };

    recognitionRef.current.onerror = (event) => {
      console.error('🎤 Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        // No speech detected - this is normal, keep listening
        console.log('No speech detected, still listening...');
      }
    };

    // Start listening
    try {
      recognitionRef.current.start();
    } catch (e) {
      console.log('Recognition start error:', e);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [permissionGranted]);

  // AI Response Generator
  const generateAIResponse = (userSpeech) => {
    let response = '';
    
    const speech = userSpeech.toLowerCase();
    
    if (speech.includes('experience') || speech.includes('worked') || speech.includes('job')) {
      response = "That's great experience! Can you tell me about a specific challenge you faced and how you overcame it? Use the STAR method - Situation, Task, Action, Result.";
    } else if (speech.includes('skill') || speech.includes('good at')) {
      response = "Excellent! How do you apply these skills in a team environment? Give me a specific example.";
    } else if (speech.includes('project')) {
      response = "Interesting project! What was your specific role and contribution to its success?";
    } else if (speech.includes('why') || speech.includes('motivation')) {
      response = "That's a good point. Can you elaborate more on what drives you?";
    } else if (speech.includes('team') || speech.includes('collaborate')) {
      response = "Teamwork is crucial. Tell me about a time you had a conflict in a team and how you resolved it.";
    } else if (speech.includes('learn') || speech.includes('improve')) {
      response = "Continuous learning is important. What new skills have you learned recently?";
    } else {
      response = "Thank you for sharing. Based on your response, I can see good communication skills. ";
      
      // Add personalized feedback
      if (metrics.eyeContact < 70) {
        response += "I notice your eye contact could be improved. Try to look directly at the camera. ";
      }
      if (metrics.posture < 70) {
        response += "Your posture could be better - sit up straight. ";
      }
      
      response += "Now, tell me about a time you demonstrated leadership.";
    }

    setAiMessage(response);
    speakText(response);
  };

  // Text-to-speech function
  const speakText = (text) => {
    if (!synthRef.current) return;

    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    // Get available voices
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.name.includes('Google UK') || voice.name.includes('Female')
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => console.log('🔊 AI speaking');
    utterance.onend = () => console.log('✅ AI finished speaking');

    synthRef.current.speak(utterance);
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
          gridTemplateColumns: '1fr 1fr 300px',
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
              
              {/* Status Indicator */}
              <div style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                background: isListening ? '#4CAF50' : '#FFA500',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: isListening ? '#fff' : '#fff',
                  animation: isListening ? 'pulse 1s infinite' : 'none'
                }}></span>
                {isListening ? '🎤 Listening...' : '⚪ Ready'}
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
              <h3 style={{ marginBottom: '1.5rem' }}>📊 Live Performance Metrics</h3>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>🎯 Posture</span>
                    <span style={{ color: '#4ECDC4', fontWeight: 'bold' }}>{Math.round(metrics.posture)}%</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px' }}>
                    <div style={{ width: `${metrics.posture}%`, height: '100%', background: '#4ECDC4', borderRadius: '4px' }}></div>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>👀 Eye Contact</span>
                    <span style={{ color: '#FFD93D', fontWeight: 'bold' }}>{Math.round(metrics.eyeContact)}%</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px' }}>
                    <div style={{ width: `${metrics.eyeContact}%`, height: '100%', background: '#FFD93D', borderRadius: '4px' }}></div>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>🎤 Clarity</span>
                    <span style={{ color: '#6BCB77', fontWeight: 'bold' }}>{Math.round(metrics.clarity)}%</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px' }}>
                    <div style={{ width: `${metrics.clarity}%`, height: '100%', background: '#6BCB77', borderRadius: '4px' }}></div>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>💪 Confidence</span>
                    <span style={{ color: '#FF6B6B', fontWeight: 'bold' }}>{Math.round(metrics.confidence)}%</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px' }}>
                    <div style={{ width: `${metrics.confidence}%`, height: '100%', background: '#FF6B6B', borderRadius: '4px' }}></div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <div style={{ flex: 1, textAlign: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Filler Words</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#FFD93D' }}>{metrics.fillerWords}</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Speaking Pace</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4ECDC4' }}>{metrics.pace}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Column - AI Interviewer */}
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '2rem',
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex',
            flexDirection: 'column'
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
                fontSize: '2rem',
                animation: 'pulse 2s infinite'
              }}>
                🤖
              </div>
              <div>
                <h3 style={{ marginBottom: '0.25rem' }}>AI Interviewer</h3>
                <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>Software Engineer • Google</p>
              </div>
            </div>

            {/* AI Message */}
            <div style={{
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '20px 20px 20px 5px',
              padding: '1.5rem',
              marginBottom: '2rem',
              fontSize: '1.1rem',
              lineHeight: '1.6',
              minHeight: '120px'
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
                maxWidth: '90%',
                marginLeft: 'auto'
              }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.5rem' }}>You said:</div>
                "{userMessage}"
              </div>
            )}

            {/* Controls */}
            <div style={{ marginTop: 'auto', display: 'flex', gap: '1rem' }}>
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
          </div>

          {/* Right Column - Live Suggestions */}
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '1.5rem',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>💡</span> Live Suggestions
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {suggestions.length > 0 ? suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  style={{
                    padding: '1rem',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '10px',
                    borderLeft: '4px solid #4ECDC4',
                    animation: 'slideIn 0.3s ease'
                  }}
                >
                  {suggestion}
                </div>
              )) : (
                <div style={{ textAlign: 'center', opacity: 0.5, padding: '2rem' }}>
                  Great job! No suggestions at the moment.
                </div>
              )}
            </div>

            {/* Quick Tips */}
            <div style={{ marginTop: '2rem' }}>
              <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', opacity: 0.7 }}>QUICK TIPS</h4>
              <ul style={{ listStyle: 'none', fontSize: '0.9rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>✓ Use STAR method</li>
                <li style={{ marginBottom: '0.5rem' }}>✓ Maintain eye contact</li>
                <li style={{ marginBottom: '0.5rem' }}>✓ Speak clearly</li>
                <li style={{ marginBottom: '0.5rem' }}>✓ Avoid filler words</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default InterviewMode;