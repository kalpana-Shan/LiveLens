// frontend/src/App.jsx
import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'; // Removed Link since it's not used

// IMPORT THE REAL INTERVIEW MODE COMPONENT
import InterviewMode from './components/modes/InterviewMode';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          {/* TEST ROUTE - Add this to check if routing works */}
          <Route path="/test" element={<div style={{color: 'white', padding: '2rem', background: '#FF6B6B', minHeight: '100vh'}}>✅ Test Page Working! Routing is fine.</div>} />
          {/* REAL INTERVIEW ROUTE with sessionId parameter */}
          <Route path="/interview/:sessionId" element={<InterviewMode />} />
          {/* OTHER MODES - Coming Soon */}
          <Route path="/debate/:sessionId" element={<ComingSoon mode="Debate" />} />
          <Route path="/public-speaking/:sessionId" element={<ComingSoon mode="Public Speaking" />} />
          <Route path="/negotiation/:sessionId" element={<ComingSoon mode="Negotiation" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

// Coming Soon Component
const ComingSoon = ({ mode }) => {
  const navigate = useNavigate();
  return (
    <div className="coming-soon">
      <div className="coming-soon-card">
        <span className="coming-soon-icon">🚀</span>
        <h1>{mode} Mode</h1>
        <p>Coming Soon! We're working hard to bring you this feature.</p>
        <button onClick={() => navigate('/')} className="back-home-btn">
          ← Back to Home
        </button>
      </div>
    </div>
  );
};

// Landing Page Component
const LandingPage = () => {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const modesRef = useRef(null);

  useEffect(() => {
    // Scroll animation observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    // Observe all elements with fade-in class
    document.querySelectorAll('.fade-in').forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const handleStartPractice = () => {
    console.log('🎯 Start Practice clicked!'); // DEBUG LINE 1
    const sessionId = 'session_' + Date.now();
    console.log('Navigating to:', `/interview/${sessionId}`); // DEBUG LINE 2
    navigate(`/interview/${sessionId}`);
  };

  const handleModeClick = (modePath) => {
    console.log(`🎯 ${modePath} mode clicked!`); // DEBUG LINE
    const sessionId = 'session_' + Date.now();
    navigate(`/${modePath}/${sessionId}`);
  };

  const modes = [
    {
      id: 'interview',
      title: 'Interview Practice',
      icon: '🎯', // Changed from 💼 to 🎯
      color: '#E8B4B8',
      desc: 'Simulate real job interviews with AI',
      path: 'interview'
    },
    {
      id: 'debate',
      title: 'Debate Mode',
      icon: '⚔️', // Changed from ⚡ to ⚔️
      color: '#AEC9BE',
      desc: '1-on-1 competitive debate practice',
      path: 'debate'
    },
    {
      id: 'public-speaking',
      title: 'Public Speaking',
      icon: '🎙️', // Changed from 🎤 to 🎙️
      color: '#E8B4B8',
      desc: 'Practice speeches & presentations',
      path: 'public-speaking'
    },
    {
      id: 'negotiation',
      title: 'Negotiation Training',
      icon: '🤝',
      color: '#AEC9BE',
      desc: 'Business negotiation scenarios',
      path: 'negotiation'
    }
  ];

  return (
    <div className="landing">
      {/* Floating Elements Background */}
      <div className="floating-elements">
        <div className="floating-circle"></div>
        <div className="floating-circle"></div>
        <div className="floating-circle"></div>
        <div className="floating-line"></div>
        <div className="floating-line"></div>
      </div>

      {/* Hero Section */}
      <section className="hero-section" ref={heroRef}>
        <div className="hero-content fade-in">
          <div className="logo-container">
            <div className="logo-icon">🎯</div> {/* Changed from 👁️ to 🎯 */}
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
            Start Free Practice →
          </button>
        </div>
        <div className="hero-scroll-indicator">
          <span>Scroll to explore</span>
          <div className="scroll-arrow">↓</div>
        </div>
      </section>

      {/* Modes Section */}
      <section className="modes-section" ref={modesRef}>
        <h2 className="section-title fade-in">Practice Modes</h2>
        <p className="section-subtitle fade-in">Choose your training path</p>
        
        <div className="modes-grid">
          {modes.map((mode, index) => (
            <div 
              key={mode.id}
              className="mode-card-wrapper fade-in"
              style={{ animationDelay: `${index * 0.2}s` }}
              onClick={() => handleModeClick(mode.path)}
            >
              <div className="mode-card" style={{ '--card-color': mode.color }}>
                <div className="mode-icon">{mode.icon}</div>
                <h3 className="mode-title">{mode.title}</h3>
                <p className="mode-desc">{mode.desc}</p>
                <div className="mode-hover-effect">
                  <span>Start Practice →</span> {/* Changed from Explore Mode */}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section fade-in">
        <h2>Ready to Level Up Your Communication?</h2>
        <button className="cta-button" onClick={handleStartPractice}>
          Start Free Practice →
        </button>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>Built with Google Gemini • MediaPipe • Firebase</p>
        <p>© 2024 LiveLens - AI Communication Coach</p>
      </footer>
    </div>
  );
};

export default App;