// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { InterviewMode } from './components/modes/InterviewMode';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/interview/:sessionId" element={<InterviewMode />} />
          <Route path="/debate/:sessionId" element={<div>Debate Mode Coming Soon</div>} />
          <Route path="/public-speaking/:sessionId" element={<div>Public Speaking Coming Soon</div>} />
          <Route path="/negotiation/:sessionId" element={<div>Negotiation Coming Soon</div>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

const LandingPage = () => {
  const features = [
    { icon: '🎯', title: 'Interview Practice', desc: 'Mock interviews with AI', path: '/interview/demo' },
    { icon: '⚡', title: 'Debate Mode', desc: '1-on-1 AI debates', path: '/debate/demo' },
    { icon: '🎤', title: 'Public Speaking', desc: 'Practice speeches', path: '/public-speaking/demo' },
    { icon: '🤝', title: 'Negotiation', desc: 'Business scenarios', path: '/negotiation/demo' },
  ];

  return (
    <div className="landing">
      {/* Animated Background */}
      <div className="animated-bg">
        <div className="gradient-1"></div>
        <div className="gradient-2"></div>
        <div className="gradient-3"></div>
      </div>

      {/* Navbar */}
      <nav className="navbar glass-effect">
        <div className="nav-content">
          <div className="logo">
            <span className="logo-icon">🎥</span>
            <span className="logo-text">LiveLens AI</span>
          </div>
          <div className="nav-links">
            <button className="nav-btn">Dashboard</button>
            <button className="nav-btn">Leaderboard</button>
            <button className="nav-btn profile-btn">
              <span>👤</span>
              <span>Profile</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Your AI Debate Coach
            <span className="gradient-text"> That Sees & Hears</span>
          </h1>
          <p className="hero-subtitle">
            Real-time posture analysis • Voice coaching • Gemini AI • 4 practice modes
          </p>
          <div className="hero-buttons">
            <button className="btn-primary">
              Start Free Practice <span className="btn-arrow">→</span>
            </button>
            <button className="btn-secondary">
              Watch Demo <span className="btn-arrow">▶</span>
            </button>
          </div>

          {/* Live Stats Preview */}
          <div className="live-preview glass-effect">
            <div className="preview-stats">
              <div className="stat">
                <span className="stat-value">87%</span>
                <span className="stat-label">Posture</span>
              </div>
              <div className="stat">
                <span className="stat-value">74%</span>
                <span className="stat-label">Eye Contact</span>
              </div>
              <div className="stat">
                <span className="stat-value">91%</span>
                <span className="stat-label">Voice</span>
              </div>
              <div className="stat">
                <span className="stat-value">82%</span>
                <span className="stat-label">Clarity</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features">
        <h2 className="section-title">Practice Modes</h2>
        <div className="features-grid">
          {features.map((feature, index) => (
            <Link to={feature.path} key={index} className="feature-card glass-effect">
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-desc">{feature.desc}</p>
              <div className="feature-hover">
                <span>Start Practice →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <h2 className="section-title">How It Works</h2>
        <div className="steps">
          <div className="step glass-effect">
            <div className="step-number">1</div>
            <div className="step-icon">📷</div>
            <h3>Calibrate</h3>
            <p>Camera detects your posture & eye contact</p>
          </div>
          <div className="step glass-effect">
            <div className="step-number">2</div>
            <div className="step-icon">🎤</div>
            <h3>Speak</h3>
            <p>AI analyzes your voice & clarity in real-time</p>
          </div>
          <div className="step glass-effect">
            <div className="step-number">3</div>
            <div className="step-icon">🤖</div>
            <h3>Get Coached</h3>
            <p>Gemini AI provides instant feedback</p>
          </div>
          <div className="step glass-effect">
            <div className="step-number">4</div>
            <div className="step-icon">📊</div>
            <h3>Improve</h3>
            <p>Track progress & share achievements</p>
          </div>
        </div>
      </section>

      {/* Leaderboard Preview */}
      <section className="leaderboard-preview glass-effect">
        <div className="preview-header">
          <h2>🏆 Hackathon Leaderboard</h2>
          <button className="view-all">View All →</button>
        </div>
        <div className="preview-list">
          <div className="rank-item">
            <span className="rank">1</span>
            <span className="user">Sarah Chen</span>
            <span className="score">98%</span>
          </div>
          <div className="rank-item">
            <span className="rank">2</span>
            <span className="user">Alex Kumar</span>
            <span className="score">96%</span>
          </div>
          <div className="rank-item">
            <span className="rank">3</span>
            <span className="user">Maria Garcia</span>
            <span className="score">95%</span>
          </div>
          <div className="rank-item highlight">
            <span className="rank">You</span>
            <span className="user">Practice to rank!</span>
            <span className="score">0%</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>Built with Google Gemini • MediaPipe • Firebase • React</p>
        <p>© 2024 LiveLens - AI Debate Coach</p>
      </footer>
    </div>
  );
};

export default App;