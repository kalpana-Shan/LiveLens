// frontend/src/App.jsx
import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/interview" element={<ModePage mode="interview" />} />
          <Route path="/debate" element={<ModePage mode="debate" />} />
          <Route path="/public-speaking" element={<ModePage mode="public" />} />
          <Route path="/negotiation" element={<ModePage mode="negotiation" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

// Landing Page Component
const LandingPage = () => {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const modesRef = useRef(null);
  const socialRef = useRef(null);

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

  const modes = [
    {
      id: 'interview',
      title: 'Interview Practice',
      icon: '💼',
      color: '#E8B4B8',
      desc: 'Simulate real job interviews with AI',
      path: '/interview'
    },
    {
      id: 'debate',
      title: 'Debate Mode',
      icon: '⚡',
      color: '#AEC9BE',
      desc: '1-on-1 competitive debate practice',
      path: '/debate'
    },
    {
      id: 'public',
      title: 'Public Speaking',
      icon: '🎤',
      color: '#E8B4B8',
      desc: 'Practice speeches & presentations',
      path: '/public-speaking'
    },
    {
      id: 'negotiation',
      title: 'Negotiation Training',
      icon: '🤝',
      color: '#AEC9BE',
      desc: 'Business negotiation scenarios',
      path: '/negotiation'
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
            <div className="logo-icon">👁️</div>
            <h1 className="logo-text">
              <span className="logo-live">Live</span>
              <span className="logo-lens">Lens</span>
            </h1>
          </div>
          <p className="hero-tagline">Your AI-Powered Communication Coach</p>
          <p className="hero-description">
            Master interviews, debates, public speaking & negotiations with real-time AI feedback
          </p>
          <div className="hero-stats">
            <div className="stat-badge">
              <span className="stat-number">10K+</span>
              <span className="stat-label">Active Users</span>
            </div>
            <div className="stat-badge">
              <span className="stat-number">95%</span>
              <span className="stat-label">Improvement Rate</span>
            </div>
            <div className="stat-badge">
              <span className="stat-number">24/7</span>
              <span className="stat-label">AI Coaching</span>
            </div>
          </div>
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
            >
              <div 
                className="mode-card"
                onClick={() => navigate(mode.path)}
                style={{ '--card-color': mode.color }}
              >
                <div className="mode-icon">{mode.icon}</div>
                <h3 className="mode-title">{mode.title}</h3>
                <p className="mode-desc">{mode.desc}</p>
                <div className="mode-hover-effect">
                  <span>Explore Mode →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="section-title fade-in">Why Choose LiveLens?</h2>
        <div className="features-grid">
          <div className="feature-item fade-in">
            <div className="feature-icon">🤖</div>
            <h3>Gemini AI Powered</h3>
            <p>Advanced Google AI provides real-time coaching</p>
          </div>
          <div className="feature-item fade-in">
            <div className="feature-icon">📊</div>
            <h3>Real-time Analytics</h3>
            <p>Posture, eye contact, voice clarity & more</p>
          </div>
          <div className="feature-item fade-in">
            <div className="feature-icon">🎯</div>
            <h3>Personalized Feedback</h3>
            <p>Custom coaching based on your performance</p>
          </div>
          <div className="feature-item fade-in">
            <div className="feature-icon">🌐</div>
            <h3>Social Features</h3>
            <p>Share, compare & compete with friends</p>
          </div>
        </div>
      </section>

      {/* Social Features Preview */}
      <section className="social-preview fade-in">
        <h2 className="section-title">Community & Social</h2>
        <div className="social-cards">
          <div className="social-card">
            <div className="social-icon">📤</div>
            <h3>Session Sharing</h3>
            <p>Share your practice sessions with coaches & peers</p>
            <ul className="social-list">
              <li>✓ Public profile showcase</li>
              <li>✓ Private mentor links</li>
              <li>✓ Team workspaces</li>
            </ul>
          </div>
          <div className="social-card">
            <div className="social-icon">📊</div>
            <h3>Score Comparison</h3>
            <p>Compare with friends & global averages</p>
            <ul className="social-list">
              <li>✓ Friend leaderboards</li>
              <li>✓ Skill breakdown</li>
              <li>✓ Improvement tracking</li>
            </ul>
          </div>
          <div className="social-card">
            <div className="social-icon">🏆</div>
            <h3>Hackathon Leaderboard</h3>
            <p>Compete with 8000+ participants</p>
            <ul className="social-list">
              <li>✓ Weekly most improved</li>
              <li>✓ Category rankings</li>
              <li>✓ Digital badges</li>
            </ul>
          </div>
          <div className="social-card">
            <div className="social-icon">🎥</div>
            <h3>Live Coaching</h3>
            <p>Real-time group & 1-on-1 sessions</p>
            <ul className="social-list">
              <li>✓ Public workshops</li>
              <li>✓ Private mentoring</li>
              <li>✓ Team debates</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section fade-in">
        <h2>Ready to Level Up Your Communication?</h2>
        <p>Join 10,000+ users already improving with LiveLens</p>
        <button className="cta-button" onClick={() => navigate('/interview')}>
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

// Mode Page Component
const ModePage = ({ mode }) => {
  const navigate = useNavigate();

  const modeContent = {
    interview: {
      title: 'Interview Practice Mode',
      icon: '💼',
      purpose: 'Simulate real job interviews for any role',
      aiBehavior: 'Acts as HR Manager / Technical Interviewer',
      metrics: ['Confidence', 'Clarity', 'STAR method usage', 'Technical accuracy'],
      flow: ['Introduction', 'Technical questions', 'Behavioral questions', 'Feedback'],
      special: ['Google', 'Microsoft', 'Startups'],
      color: '#E8B4B8'
    },
    debate: {
      title: 'Debate Mode',
      icon: '⚡',
      purpose: '1-on-1 competitive debate practice',
      aiBehavior: 'Acts as Opponent + Judge simultaneously',
      metrics: ['Argument strength', 'Rebuttal speed', 'Logic', 'Persuasion'],
      flow: ['Topic selection', 'Opening statements', 'Cross-examination', 'Closing'],
      special: ['Real-time rebuttal suggestions', 'Argument strength meter'],
      color: '#AEC9BE'
    },
    public: {
      title: 'Public Speaking Mode',
      icon: '🎤',
      purpose: 'Practice speeches, presentations, pitches',
      aiBehavior: 'Acts as Audience + Speech Coach',
      metrics: ['Audience engagement', 'Vocal variety', 'Body language', 'Pacing'],
      flow: ['Speech setup', 'Delivery', 'Audience reaction simulation', 'Feedback'],
      special: ['Virtual audience with reactions', 'Teleprompter mode'],
      color: '#E8B4B8'
    },
    negotiation: {
      title: 'Negotiation Training',
      icon: '🤝',
      purpose: 'Business negotiation scenarios',
      aiBehavior: 'Acts as Client/Partner with specific personality types',
      metrics: ['Persuasion tactics', 'Concession patterns', 'Emotional control'],
      flow: ['Scenario setup', 'Negotiation rounds', 'Deal or no deal', 'Analysis'],
      special: ['Aggressive', 'Cooperative', 'Analytical'],
      color: '#AEC9BE'
    }
  };

  const content = modeContent[mode];

  return (
    <div className="mode-page" style={{ '--mode-color': content.color }}>
      <button className="back-button" onClick={() => navigate('/')}>← Back to Home</button>
      
      <div className="mode-header">
        <div className="mode-header-icon">{content.icon}</div>
        <h1>{content.title}</h1>
      </div>

      <div className="mode-content">
        <div className="mode-card-large">
          <h3>🎯 Purpose</h3>
          <p>{content.purpose}</p>
        </div>

        <div className="mode-card-large">
          <h3>🤖 AI Behavior</h3>
          <p>{content.aiBehavior}</p>
        </div>

        <div className="mode-card-large">
          <h3>📊 Metrics Tracked</h3>
          <div className="metrics-list">
            {content.metrics.map((metric, i) => (
              <span key={i} className="metric-tag">{metric}</span>
            ))}
          </div>
        </div>

        <div className="mode-card-large">
          <h3>🔄 Practice Flow</h3>
          <div className="flow-steps">
            {content.flow.map((step, i) => (
              <div key={i} className="flow-step">
                <span className="step-number">{i + 1}</span>
                <span className="step-text">{step}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mode-card-large">
          <h3>✨ Special Features</h3>
          <div className="special-list">
            {content.special.map((item, i) => (
              <span key={i} className="special-tag">{item}</span>
            ))}
          </div>
        </div>

        {/* Social Features Section */}
        <div className="mode-social-section">
          <h2>Social Features</h2>
          <div className="social-actions">
            <button className="social-action-btn">
              <span>📤</span> Share Session
            </button>
            <button className="social-action-btn">
              <span>📊</span> Compare Scores
            </button>
            <button className="social-action-btn">
              <span>🏆</span> Leaderboard
            </button>
            <button className="social-action-btn">
              <span>🎥</span> Live Coaching
            </button>
          </div>
        </div>

        <button className="start-practice-btn">
          Start Practicing Now →
        </button>
      </div>
    </div>
  );
};

export default App;