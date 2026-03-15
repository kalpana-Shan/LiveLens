// frontend/src/App.jsx
import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useMediaPipeAnalysis } from './hooks/useMediaPipeAnalysis';
import { useSileroVAD } from './hooks/useSileroVAD';
import { useWebSocket } from './hooks/useWebSocket';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/interview/:sessionId" element={<InterviewSession />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

// Live Interview Session Component
const InterviewSession = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [sessionId] = useState(() => 'session_' + Date.now());
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  
  // Initialize hooks
  const mediaMetrics = useMediaPipeAnalysis(videoRef, isCameraActive);
  const { isSpeaking, voiceMetrics } = useSileroVAD();
  const { isConnected, sendMessage, messages } = useWebSocket(sessionId);

  const [currentQuestion, setCurrentQuestion] = useState('Welcome to your interview practice! I\'m your AI interviewer. Tell me about yourself and why you\'re interested in this role.');
  const [userResponse, setUserResponse] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  useEffect(() => {
    // Request camera and microphone access immediately
    const initMedia = async () => {
      try {
        console.log('Requesting camera and microphone access...');
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
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        
        setIsCameraActive(true);
        setPermissionGranted(true);
        setError('');
        
        console.log('✅ Camera and microphone access granted');
      } catch (err) {
        console.error('Media error:', err);
        setError('Please allow camera and microphone access to use LiveLens');
        setPermissionGranted(false);
      }
    };

    initMedia();

    // Cleanup
    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => {
          track.stop();
          console.log('Stopped track:', track.kind);
        });
      }
    };
  }, []);

  useEffect(() => {
    if (isConnected && permissionGranted) {
      console.log('✅ WebSocket connected, starting interview...');
      // Start interview session
      sendMessage({
        type: 'start_interview',
        payload: {
          company: 'google',
          role: 'software_engineer',
          sessionId
        }
      });

      setChatHistory([{
        type: 'ai',
        text: currentQuestion,
        timestamp: Date.now()
      }]);
    }
  }, [isConnected, permissionGranted]);

  useEffect(() => {
    // Process incoming messages
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      console.log('📩 Received message:', lastMsg);
      
      if (lastMsg.type === 'interview_started') {
        setCurrentQuestion(lastMsg.first_message);
        setChatHistory(prev => [...prev, {
          type: 'ai',
          text: lastMsg.first_message,
          timestamp: Date.now()
        }]);
      } else if (lastMsg.type === 'interview_feedback') {
        setChatHistory(prev => [...prev, {
          type: 'ai',
          text: lastMsg.interviewer_response,
          analysis: lastMsg.analysis,
          timestamp: Date.now()
        }]);
        
        if (lastMsg.next_question) {
          setTimeout(() => {
            setCurrentQuestion(lastMsg.next_question);
            setChatHistory(prev => [...prev, {
              type: 'ai',
              text: lastMsg.next_question,
              isQuestion: true,
              timestamp: Date.now()
            }]);
          }, 1500);
        }
      }
    }
  }, [messages]);

  const handleSendResponse = () => {
    if (!userResponse.trim()) return;

    // Add user message to chat
    setChatHistory(prev => [...prev, {
      type: 'user',
      text: userResponse,
      timestamp: Date.now()
    }]);

    // Send to backend
    sendMessage({
      type: 'interview_response',
      payload: {
        response: userResponse,
        metrics: {
          posture: Math.round(mediaMetrics.posture || 0),
          eyeContact: Math.round(mediaMetrics.eyeContact || 0),
          clarity: Math.round(voiceMetrics.clarity || 85),
          volume: voiceMetrics.volume || 0,
          isSpeaking: isSpeaking
        }
      }
    });

    setUserResponse('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendResponse();
    }
  };

  if (error) {
    return (
      <div className="error-container">
        <div className="error-card">
          <span className="error-icon">⚠️</span>
          <h2>{error}</h2>
          <p>Click the button below and allow camera & microphone access</p>
          <button onClick={() => window.location.reload()} className="retry-btn">
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="interview-session">
      <button className="back-btn" onClick={() => navigate('/')}>← Back to Home</button>
      
      <div className="session-grid">
        {/* Video Section */}
        <div className="video-section">
          {!permissionGranted && (
            <div className="permission-overlay">
              <div className="permission-card">
                <span className="permission-icon">🎥</span>
                <h3>Camera & Microphone Access Needed</h3>
                <p>Please allow access to start your practice session</p>
              </div>
            </div>
          )}
          
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted={false}
            className="session-video"
          />
          
          {/* Live Metrics Overlay */}
          <div className="metrics-overlay">
            <div className="metric-item">
              <span className="metric-label">Posture</span>
              <span className="metric-value" style={{ color: '#FF6B6B', fontWeight: 'bold' }}>
                {Math.round(mediaMetrics.posture || 0)}%
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Eye Contact</span>
              <span className="metric-value" style={{ color: '#4ECDC4', fontWeight: 'bold' }}>
                {Math.round(mediaMetrics.eyeContact || 0)}%
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Voice</span>
              <span className="metric-value" style={{ color: '#FFD93D', fontWeight: 'bold' }}>
                {isSpeaking ? '🔴 SPEAKING' : '⚪ SILENT'}
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Clarity</span>
              <span className="metric-value" style={{ color: '#6BCB77', fontWeight: 'bold' }}>
                {Math.round(voiceMetrics.clarity || 85)}%
              </span>
            </div>
          </div>

          {/* Connection Status */}
          <div className={`connection-status ${isConnected ? 'connected' : 'connecting'}`}>
            {isConnected ? '✅ AI Coach Connected' : '🔄 Connecting to AI Coach...'}
          </div>

          {/* Permission Status */}
          {permissionGranted && (
            <div className="permission-status">
              ✅ Camera & Microphone Active
            </div>
          )}
        </div>

        {/* Chat Section */}
        <div className="chat-section">
          <div className="chat-header">
            <div className="chat-header-left">
              <span className="chat-avatar">🤖</span>
              <div>
                <h3>AI Interviewer</h3>
                <span className="chat-status">Online</span>
              </div>
            </div>
            <div className="chat-header-right">
              <button className="header-btn">📤 Share</button>
              <button className="header-btn">📊 Stats</button>
            </div>
          </div>

          <div className="chat-messages">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`message ${msg.type}`}>
                <div className="message-sender">
                  {msg.type === 'ai' ? '🤖 AI Coach' : '👤 You'}
                  <span className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="message-text">{msg.text}</div>
                {msg.analysis && (
                  <div className="message-analysis">
                    <span className="analysis-badge" style={{ background: '#FF6B6B' }}>
                      STAR: {msg.analysis.star_method_score}%
                    </span>
                    <span className="analysis-badge" style={{ background: '#4ECDC4' }}>
                      Technical: {msg.analysis.technical_score}%
                    </span>
                    <span className="analysis-badge" style={{ background: '#FFD93D' }}>
                      Communication: {msg.analysis.communication_score}%
                    </span>
                  </div>
                )}
              </div>
            ))}
            {isSpeaking && (
              <div className="speaking-indicator">
                <span className="wave">🎤</span> Speaking...
              </div>
            )}
          </div>

          <div className="chat-input-area">
            <textarea
              value={userResponse}
              onChange={(e) => setUserResponse(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your response here... (Press Enter to send)"
              disabled={!isConnected}
            />
            <button 
              onClick={handleSendResponse}
              disabled={!isConnected || !userResponse.trim()}
              className="send-btn"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Landing Page Component
const LandingPage = () => {
  const navigate = useNavigate();

  const handleStartPractice = () => {
    const sessionId = 'session_' + Date.now();
    navigate(`/interview/${sessionId}`);
  };

  const modes = [
    {
      id: 'interview',
      title: 'Interview Practice',
      icon: '🎯',
      color: '#FF6B6B',
      desc: 'Simulate real job interviews with AI',
      features: ['STAR Method', 'Technical Questions', 'Real-time Feedback']
    },
    {
      id: 'debate',
      title: 'Debate Mode',
      icon: '⚔️',
      color: '#4ECDC4',
      desc: '1-on-1 competitive debate practice',
      features: ['Argument Analysis', 'Rebuttal Training', 'Logic Scoring']
    },
    {
      id: 'public',
      title: 'Public Speaking',
      icon: '🎙️',
      color: '#FFD93D',
      desc: 'Practice speeches & presentations',
      features: ['Audience Engagement', 'Pacing Control', 'Body Language']
    },
    {
      id: 'negotiation',
      title: 'Negotiation Training',
      icon: '🤝',
      color: '#6BCB77',
      desc: 'Business negotiation scenarios',
      features: ['Persuasion Tactics', 'Emotional Control', 'Deal Making']
    }
  ];

  return (
    <div className="landing">
      {/* Animated Background */}
      <div className="animated-bg">
        <div className="gradient-1"></div>
        <div className="gradient-2"></div>
      </div>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content fade-in">
          <div className="logo-container">
            <span className="logo-icon">🎯</span>
            <h1 className="logo-text">
              <span className="logo-live">Live</span>
              <span className="logo-lens">Lens</span>
            </h1>
          </div>
          <p className="hero-tagline">AI-Powered Communication Coach</p>
          <p className="hero-description">
            Master interviews, debates, public speaking & negotiations with real-time AI feedback
          </p>
          <button className="cta-button" onClick={handleStartPractice}>
            Start Free Practice <span className="btn-arrow">→</span>
          </button>
        </div>
      </section>

      {/* Modes Section */}
      <section className="modes-section">
        <h2 className="section-title fade-in">Practice Modes</h2>
        <div className="modes-grid">
          {modes.map((mode, index) => (
            <div 
              key={mode.id}
              className="mode-card-wrapper fade-in"
              style={{ animationDelay: `${index * 0.2}s` }}
              onClick={handleStartPractice}
            >
              <div className="mode-card" style={{ '--card-color': mode.color }}>
                <div className="mode-icon">{mode.icon}</div>
                <h3 className="mode-title">{mode.title}</h3>
                <p className="mode-desc">{mode.desc}</p>
                <div className="mode-features">
                  {mode.features.map((feature, i) => (
                    <span key={i} className="mode-feature-tag">✓ {feature}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Social Features */}
      <section className="social-section">
        <h2 className="section-title fade-in">Community Features</h2>
        <div className="social-grid">
          <div className="social-card fade-in">
            <span className="social-icon">📤</span>
            <h3>Share Sessions</h3>
            <p>Share your practice sessions with mentors & peers</p>
          </div>
          <div className="social-card fade-in">
            <span className="social-icon">📊</span>
            <h3>Compare Scores</h3>
            <p>Compare your progress with friends</p>
          </div>
          <div className="social-card fade-in">
            <span className="social-icon">🏆</span>
            <h3>Leaderboard</h3>
            <p>Compete in the hackathon leaderboard</p>
          </div>
          <div className="social-card fade-in">
            <span className="social-icon">🎥</span>
            <h3>Live Coaching</h3>
            <p>Join live group coaching sessions</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>Powered by Google Gemini • MediaPipe • Firebase</p>
        <p>© 2024 LiveLens - AI Communication Coach</p>
      </footer>
    </div>
  );
};

export default App;