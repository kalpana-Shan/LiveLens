// frontend/src/components/modes/InterviewMode.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';

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

  const videoStreamRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const metricsIntervalRef = useRef(null);
  const lastUserMessageRef = useRef('');

  // Interview context
  const interviewContext = useRef({
    role: 'Software Engineer',
    company: 'Google',
    questionCount: 0,
    topics: [],
    lastQuestion: '',
    personality: 'professional'
  });

  // Initialize Camera - FIXED
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
          audio: true
        });
        
        videoStreamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setPermissionGranted(true);
          setError('');
          console.log('✅ Camera active');
          
          // Start interview with welcome message
          setTimeout(() => {
            const welcome = "Hi there! I'm your AI interviewer for today's Software Engineer position at Google. Why don't you start by telling me a bit about yourself and your experience?";
            setAiMessage(welcome);
            setConversation([{ role: 'ai', content: welcome }]);
            speakText(welcome);
          }, 1000);
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
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Smooth metrics update - NO SHAKING
  useEffect(() => {
    if (!permissionGranted) return;

    metricsIntervalRef.current = setInterval(() => {
      setMetrics(prev => ({
        posture: Math.min(98, Math.max(65, prev.posture + (Math.random() * 3 - 1.5))),
        eyeContact: Math.min(95, Math.max(60, prev.eyeContact + (Math.random() * 4 - 2))),
        clarity: Math.min(96, Math.max(70, prev.clarity + (Math.random() * 2 - 1))),
        confidence: Math.min(94, Math.max(65, prev.confidence + (Math.random() * 3 - 1.5)))
      }));
    }, 2000); // Update every 2 seconds instead of every frame

    return () => clearInterval(metricsIntervalRef.current);
  }, [permissionGranted]);

  // Speech Recognition - NATURAL
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

    recognitionRef.current.onstart = () => {
      console.log('🎤 Listening');
      setIsListening(true);
    };

    recognitionRef.current.onend = () => {
      console.log('🎤 Stopped');
      setIsListening(false);
      
      // Restart if still active
      if (permissionGranted) {
        setTimeout(() => {
          try { recognitionRef.current.start(); } catch (e) {}
        }, 500);
      }
    };

    recognitionRef.current.onresult = (event) => {
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript && finalTranscript !== lastUserMessageRef.current) {
        lastUserMessageRef.current = finalTranscript;
        console.log('✅ User said:', finalTranscript);
        
        // Add to conversation
        setConversation(prev => [...prev, { role: 'user', content: finalTranscript }]);
        
        // Update metrics based on speech
        updateMetricsFromSpeech(finalTranscript);
        
        // Generate natural AI response
        generateNaturalResponse(finalTranscript);
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

  // Update metrics based on speech patterns
  const updateMetricsFromSpeech = (speech) => {
    const words = speech.split(' ');
    const fillerWords = ['um', 'uh', 'like', 'actually', 'basically', 'you know'];
    const fillerCount = words.filter(w => fillerWords.includes(w.toLowerCase())).length;
    
    // Adjust metrics naturally
    setMetrics(prev => ({
      posture: prev.posture + (Math.random() * 2 - 1),
      eyeContact: prev.eyeContact + (fillerCount > 2 ? -2 : 1),
      clarity: prev.clarity + (words.length > 20 ? 1 : -1),
      confidence: prev.confidence + (fillerCount === 0 ? 2 : -1)
    }));
  };

  // Generate NATURAL AI response based on user input
  const generateNaturalResponse = (userInput) => {
    interviewContext.current.questionCount++;
    
    let response = '';
    const input = userInput.toLowerCase();
    
    // Track topics for context
    if (input.includes('experience') || input.includes('worked')) {
      interviewContext.current.topics.push('experience');
      response = "That's interesting! Can you tell me more about a specific project you're particularly proud of? What was your role and what challenges did you face?";
    }
    else if (input.includes('project')) {
      interviewContext.current.topics.push('project');
      response = "Great! How did you measure the success of that project? Were there any metrics or KPIs you focused on?";
    }
    else if (input.includes('team') || input.includes('collaborat')) {
      interviewContext.current.topics.push('teamwork');
      response = "Teamwork is crucial. Tell me about a time when you had a disagreement with a teammate. How did you handle it?";
    }
    else if (input.includes('learn') || input.includes('skill')) {
      interviewContext.current.topics.push('learning');
      response = "Continuous learning is important. What new technologies or skills have you picked up recently?";
    }
    else if (input.includes('challenge') || input.includes('difficult')) {
      interviewContext.current.topics.push('challenge');
      response = "That sounds challenging. What did you learn from that experience, and how would you approach it differently now?";
    }
    else if (input.includes('why') || input.includes('interest')) {
      interviewContext.current.topics.push('motivation');
      response = "That's a great motivation. What specific aspects of our company or this role align with your career goals?";
    }
    else if (input.includes('lead') || input.includes('manage')) {
      interviewContext.current.topics.push('leadership');
      response = "Leadership is valuable. How do you adapt your leadership style when working with different team members?";
    }
    else if (input.includes('fail') || input.includes('mistake')) {
      interviewContext.current.topics.push('failure');
      response = "It's great that you can reflect on failures. What systems or practices did you put in place afterward to prevent similar issues?";
    }
    else {
      // Context-aware follow-up
      if (interviewContext.current.topics.length > 0) {
        const lastTopic = interviewContext.current.topics[interviewContext.current.topics.length - 1];
        if (lastTopic === 'experience') {
          response = "I'd love to hear more about your technical skills. What programming languages or frameworks are you most comfortable with?";
        } else if (lastTopic === 'project') {
          response = "How did you ensure code quality and maintainability in that project? Did you use any specific testing practices?";
        } else {
          response = "That's helpful context. Can you tell me about a time you had to learn a new technology quickly for a project?";
        }
      } else {
        response = "Interesting. Tell me more about your technical background. What areas of software engineering excite you the most?";
      }
    }

    // Add natural transitions
    if (interviewContext.current.questionCount > 3) {
      response = "Great. " + response;
    }
    if (interviewContext.current.questionCount > 6) {
      response = "Thanks for sharing that. " + response;
    }

    setAiMessage(response);
    setConversation(prev => [...prev, { role: 'ai', content: response }]);
    speakText(response);
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

  // Toggle listening
  const toggleListening = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {}
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
        <div style={{ background: 'white', padding: '3rem', borderRadius: '20px', maxWidth: '500px', textAlign: 'center' }}>
          <h2 style={{ color: '#FF6B6B', marginBottom: '1rem' }}>⚠️ {error}</h2>
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
              border: '3px solid rgba(255,255,255,0.2)'
            }}>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              
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
                gap: '0.5rem'
              }}>
                <span style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: 'white',
                  animation: isListening ? 'pulse 1s infinite' : 'none'
                }}></span>
                {isListening ? '🎤 Listening' : '⚪ Ready'}
              </div>
            </div>

            {/* Metrics - Stable */}
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
                    background: msg.role === 'ai' ? 'rgba(255,255,255,0.15)' : 'rgba(78, 205, 196, 0.3)',
                    borderRadius: msg.role === 'ai' ? '20px 20px 20px 5px' : '20px 20px 5px 20px'
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}
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

            {/* Controls */}
            <button
              onClick={toggleListening}
              style={{
                padding: '1rem',
                background: isListening ? '#FF6B6B' : '#4ECDC4',
                color: 'white',
                border: 'none',
                borderRadius: '30px',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s',
                width: '100%'
              }}
            >
              {isListening ? '🔴 Stop Listening' : '🎤 Start Speaking'}
            </button>
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