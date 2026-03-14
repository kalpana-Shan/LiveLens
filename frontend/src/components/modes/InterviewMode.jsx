import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useMediaPipeAnalysis } from '../../hooks/useMediaPipeAnalysis';
import { useSileroVAD } from '../../hooks/useSileroVAD';
import './InterviewMode.css';

export const InterviewMode = ({ sessionId }) => {
  const [step, setStep] = useState('setup'); // setup, interview, feedback
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [interviewData, setInterviewData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentResponse, setCurrentResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const videoRef = useRef(null);
  const mediaMetrics = useMediaPipeAnalysis(videoRef);
  const { isSpeaking, voiceMetrics } = useSileroVAD();
  const ws = useWebSocket(sessionId);

  const companies = [
    { id: 'google', name: 'Google', icon: '🔵' },
    { id: 'microsoft', name: 'Microsoft', icon: '🟢' },
    { id: 'amazon', name: 'Amazon', icon: '🟠' },
    { id: 'startup', name: 'Startup', icon: '🚀' }
  ];

  const roles = [
    { id: 'software_engineer', name: 'Software Engineer', icon: '💻' },
    { id: 'product_manager', name: 'Product Manager', icon: '📊' },
    { id: 'sales_manager', name: 'Sales Manager', icon: '🤝' },
    { id: 'data_scientist', name: 'Data Scientist', icon: '📈' }
  ];

  useEffect(() => {
    if (!ws) return;

    ws.on('interview_started', (data) => {
      setInterviewData(data);
      setMessages([{
        type: 'interviewer',
        text: data.first_message,
        timestamp: Date.now()
      }]);
      setStep('interview');
    });

    ws.on('interview_feedback', (data) => {
      setIsProcessing(false);
      setMessages(prev => [...prev, {
        type: 'interviewer',
        text: data.interviewer_response,
        analysis: data.analysis,
        timestamp: Date.now()
      }]);
      
      if (data.next_question) {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            type: 'interviewer',
            text: data.next_question,
            isQuestion: true,
            timestamp: Date.now()
          }]);
        }, 1000);
      }
    });

    ws.on('interview_complete', (data) => {
      setInterviewData(prev => ({ ...prev, feedback: data.payload }));
      setStep('feedback');
    });
  }, [ws]);

  const handleStartInterview = () => {
    if (!company || !role) return;
    
    ws.send({
      type: 'start_interview',
      payload: { company, role }
    });
  };

  const handleSendResponse = () => {
    if (!currentResponse.trim() || isProcessing) return;
    
    setIsProcessing(true);
    
    // Add user message
    setMessages(prev => [...prev, {
      type: 'candidate',
      text: currentResponse,
      timestamp: Date.now()
    }]);

    // Send to backend
    ws.send({
      type: 'interview_response',
      payload: {
        response: currentResponse,
        metrics: {
          ...mediaMetrics,
          ...voiceMetrics
        }
      }
    });

    setCurrentResponse('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendResponse();
    }
  };

  if (step === 'setup') {
    return (
      <div className="interview-setup">
        <h1>Interview Practice Mode</h1>
        <p className="subtitle">Select your interview scenario</p>

        <div className="setup-grid">
          <div className="setup-section">
            <h3>Choose Company</h3>
            <div className="company-grid">
              {companies.map(c => (
                <button
                  key={c.id}
                  className={`company-card ${company === c.id ? 'selected' : ''}`}
                  onClick={() => setCompany(c.id)}
                >
                  <span className="company-icon">{c.icon}</span>
                  <span className="company-name">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="setup-section">
            <h3>Choose Role</h3>
            <div className="role-grid">
              {roles.map(r => (
                <button
                  key={r.id}
                  className={`role-card ${role === r.id ? 'selected' : ''}`}
                  onClick={() => setRole(r.id)}
                >
                  <span className="role-icon">{r.icon}</span>
                  <span className="role-name">{r.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          className="start-btn"
          onClick={handleStartInterview}
          disabled={!company || !role}
        >
          Start Interview →
        </button>
      </div>
    );
  }

  if (step === 'feedback') {
    const feedback = interviewData?.feedback;
    
    return (
      <div className="interview-feedback">
        <h1>Interview Complete!</h1>
        
        <div className="score-circle">
          <div className="score-number">{feedback?.final_scores.overall}</div>
          <div className="score-label">Overall Score</div>
        </div>

        <div className="feedback-grid">
          <div className="feedback-card">
            <h3>Technical</h3>
            <div className="score-bar">
              <div style={{ width: `${feedback?.final_scores.technical}%` }} />
            </div>
            <span>{feedback?.final_scores.technical}%</span>
          </div>

          <div className="feedback-card">
            <h3>Behavioral</h3>
            <div className="score-bar">
              <div style={{ width: `${feedback?.final_scores.behavioral}%` }} />
            </div>
            <span>{feedback?.final_scores.behavioral}%</span>
          </div>

          <div className="feedback-card">
            <h3>Communication</h3>
            <div className="score-bar">
              <div style={{ width: `${feedback?.final_scores.communication}%` }} />
            </div>
            <span>{feedback?.final_scores.communication}%</span>
          </div>
        </div>

        <div className="feedback-summary">
          <h3>{feedback?.feedback_summary}</h3>
          
          <div className="strengths">
            <h4>✅ Strengths</h4>
            <ul>
              {feedback?.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>

          <div className="improvements">
            <h4>📈 Areas to Improve</h4>
            <ul>
              {feedback?.areas_for_improvement.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="action-buttons">
          <button onClick={() => setStep('setup')}>Practice Again</button>
          <button className="share-btn">Share Results</button>
        </div>
      </div>
    );
  }

  return (
    <div className="interview-mode">
      <div className="interview-header">
        <div className="company-info">
          <span className="company-badge">
            {companies.find(c => c.id === company)?.icon} {companies.find(c => c.id === company)?.name}
          </span>
          <span className="role-badge">
            {roles.find(r => r.id === role)?.icon} {roles.find(r => r.id === role)?.name}
          </span>
        </div>
        <div className="round-info">
          Round {interviewData?.round} of {roles.find(r => r.id === role)?.interview_rounds?.length}
        </div>
      </div>

      <div className="interview-main">
        <div className="video-section">
          <video ref={videoRef} autoPlay playsInline className="interview-video" />
          
          <div className="live-metrics">
            <div className="metric">
              <label>Posture</label>
              <div className="metric-value">{Math.round(mediaMetrics.posture)}%</div>
            </div>
            <div className="metric">
              <label>Eye Contact</label>
              <div className="metric-value">{Math.round(mediaMetrics.eyeContact)}%</div>
            </div>
            <div className="metric">
              <label>Clarity</label>
              <div className="metric-value">{Math.round(voiceMetrics.clarity || 85)}%</div>
            </div>
          </div>
        </div>

        <div className="chat-section">
          <div className="chat-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.type}`}>
                <div className="message-sender">
                  {msg.type === 'interviewer' ? '👔 Interviewer' : '👤 You'}
                </div>
                <div className="message-text">{msg.text}</div>
                {msg.analysis && (
                  <div className="message-analysis">
                    <div className="analysis-badge">STAR: {msg.analysis.star_method_score}%</div>
                    <div className="analysis-badge">Technical: {msg.analysis.technical_score}%</div>
                    <div className="analysis-badge">Communication: {msg.analysis.communication_score}%</div>
                  </div>
                )}
              </div>
            ))}
            {isProcessing && (
              <div className="typing-indicator">Interviewer is typing...</div>
            )}
          </div>

          <div className="chat-input">
            <textarea
              value={currentResponse}
              onChange={(e) => setCurrentResponse(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your response..."
              disabled={isProcessing}
            />
            <button 
              onClick={handleSendResponse}
              disabled={!currentResponse.trim() || isProcessing}
            >
              Send
            </button>
          </div>

          {isSpeaking && (
            <div className="voice-indicator">🎤 Speaking...</div>
          )}
        </div>
      </div>
    </div>
  );
};