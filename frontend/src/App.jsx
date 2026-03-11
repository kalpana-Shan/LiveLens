
import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import useWebSocket from './hooks/useWebSocket';

// ─────────────────────────────────────────────
// ONBOARDING SCREEN
// ─────────────────────────────────────────────
const OnboardingScreen = ({ onNext }) => (
  <div style={s.page}>
    <div className="bg-animated" />
    <div style={{ position:'relative', zIndex:1, textAlign:'center', maxWidth:520, padding:'2rem' }}>

      <div style={{ display:'flex', justifyContent:'center', marginBottom:'2rem' }}>
        <div style={{ position:'relative' }}>
          <div className="orb">👁️</div>
          <div className="pulse-ring" />
        </div>
      </div>

      <h1 className="gradient-text fade-up" style={{ fontSize:'3.2rem', fontWeight:800, marginBottom:'0.5rem' }}>
        LiveLens
      </h1>
      <p className="fade-up-2" style={{ color:'#94a3b8', fontSize:'1.1rem', marginBottom:'2.5rem', lineHeight:1.6 }}>
        Your AI coaching companion — watches your posture,<br/>
        listens to your voice, and coaches you in real time.
      </p>

      <div className="glass fade-up-3" style={{ padding:'1.5rem', marginBottom:'2rem', textAlign:'left' }}>
        {[
          ['🎙️', 'Voice Analysis', 'Pace, tone, and clarity feedback live'],
          ['🧍', 'Posture Tracking', 'MediaPipe-powered body signals'],
          ['👁️', 'Gaze Detection', 'Eye contact scoring in real time'],
          ['🤖', 'Gemini AI Coach', 'Powered by Google Gemini Live API'],
        ].map(([icon, title, desc]) => (
          <div key={title} style={{ display:'flex', gap:'1rem', alignItems:'center', padding:'0.75rem 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize:'1.5rem' }}>{icon}</span>
            <div>
              <div style={{ fontWeight:600, color:'#e2e8f0', fontSize:'0.95rem' }}>{title}</div>
              <div style={{ color:'#64748b', fontSize:'0.82rem' }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      <button className="btn-primary fade-up-4" onClick={onNext} style={{ width:'100%', fontSize:'1.05rem' }}>
        Start Your Session →
      </button>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// CALIBRATION SCREEN
// ─────────────────────────────────────────────
const CalibrationScreen = ({ onNext }) => {
  const [phase, setPhase] = useState('idle'); // idle | scanning | done
  const [tip, setTip] = useState(0);

  const tips = [
    '📐 Sit upright — back straight, shoulders relaxed',
    '👁️ Look directly at the camera lens',
    '💡 Make sure your face is well-lit from the front',
  ];

  const handleStart = () => {
    setPhase('scanning');
    let i = 0;
    const iv = setInterval(() => {
      i++; setTip(i % tips.length);
    }, 700);
    setTimeout(() => { clearInterval(iv); setPhase('done'); }, 2200);
  };

  return (
    <div style={s.page}>
      <div className="bg-animated" />
      <div style={{ position:'relative', zIndex:1, textAlign:'center', maxWidth:480, padding:'2rem', width:'100%' }}>

        <div className="glass-strong fade-up" style={{ padding:'2.5rem' }}>
          <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>🎯</div>
          <h2 style={{ fontSize:'1.8rem', fontWeight:700, marginBottom:'0.5rem' }}>
            {phase === 'done' ? '✅ Calibration Complete' : 'Baseline Calibration'}
          </h2>
          <p style={{ color:'#94a3b8', marginBottom:'2rem', fontSize:'0.95rem' }}>
            We capture your neutral posture so all feedback is personalised to <strong style={{color:'#c084fc'}}>you</strong>.
          </p>

          {phase === 'idle' && (
            <div style={{ marginBottom:'2rem' }}>
              {tips.map((t, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.65rem 0.75rem', marginBottom:'0.5rem', background:'rgba(255,255,255,0.03)', borderRadius:10, textAlign:'left', fontSize:'0.88rem', color:'#cbd5e1' }}>
                  {t}
                </div>
              ))}
            </div>
          )}

          {phase === 'scanning' && (
            <div style={{ marginBottom:'2rem' }}>
              <div style={{ padding:'1rem', background:'rgba(99,102,241,0.1)', borderRadius:12, marginBottom:'1rem', color:'#a5b4fc', fontSize:'0.95rem' }}>
                {tips[tip]}
              </div>
              <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:6, overflow:'hidden', height:6 }}>
                <div className="cal-bar" />
              </div>
              <p style={{ color:'#64748b', fontSize:'0.82rem', marginTop:'0.75rem' }}>Scanning your baseline...</p>
            </div>
          )}

          {phase === 'done' && (
            <div style={{ marginBottom:'2rem' }}>
              {[['🧍 Posture','Captured ✓'],['👁️ Gaze','Calibrated ✓'],['💡 Lighting','Good ✓']].map(([k,v])=>(
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'0.65rem 0', borderBottom:'1px solid rgba(255,255,255,0.05)', fontSize:'0.9rem' }}>
                  <span style={{ color:'#94a3b8' }}>{k}</span>
                  <span style={{ color:'#4ade80', fontWeight:600 }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          {phase === 'idle' && <button className="btn-primary" onClick={handleStart} style={{width:'100%'}}>Begin Calibration</button>}
          {phase === 'done' && <button className="btn-primary" onClick={onNext} style={{width:'100%'}}>Enter Live Session →</button>}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// SESSION SCREEN
// ─────────────────────────────────────────────
const SessionScreen = ({ sessionId, onEnd }) => {
  const { sendSignal, onCoachingAudio } = useWebSocket(sessionId);
  const [elapsed, setElapsed] = useState(0);
  const [coachMsg, setCoachMsg] = useState('Initialising your session...');
  const [postureScore, setPostureScore] = useState(92);
  const [gazeScore, setGazeScore] = useState(78);
  const [isCoaching, setIsCoaching] = useState(false);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    onCoachingAudio(() => {
      setIsCoaching(true);
      setTimeout(() => setIsCoaching(false), 3000);
    });
    setTimeout(() => {
      setCoachMsg('🎙️ Great start! Maintain eye contact.');
      setEvents(ev => [{ time: '0:05', msg: 'Good posture detected' }, ...ev]);
    }, 1500);
    const iv = setInterval(() => {
      sendSignal({ type:'posture', score:0.9, ts:Date.now() });
      setPostureScore(s => Math.min(100, s + (Math.random() > 0.5 ? 1 : -1)));
      setGazeScore(s => Math.min(100, s + (Math.random() > 0.5 ? 2 : -2)));
    }, 4000);
    return () => clearInterval(iv);
  }, [onCoachingAudio, sendSignal]);

  const fmt = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  return (
    <div style={s.page}>
      <div className="bg-animated" />
      <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:600, padding:'1.5rem' }}>

        {/* Header bar */}
        <div className="glass fade-up" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.9rem 1.5rem', marginBottom:'1rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
            <div className="status-dot" />
            <span style={{ color:'#4ade80', fontWeight:600, fontSize:'0.9rem' }}>LIVE</span>
          </div>
          <span className="gradient-text" style={{ fontWeight:700, fontSize:'1.05rem' }}>LiveLens</span>
          <span style={{ color:'#94a3b8', fontFamily:'monospace', fontSize:'0.95rem' }}>{fmt(elapsed)}</span>
        </div>

        {/* Camera Feed Placeholder */}
        <div className="glass fade-up-2" style={{ width:'100%', aspectRatio:'16/9', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'1rem', position:'relative', overflow:'hidden' }}>
          <div style={{ textAlign:'center', color:'#475569' }}>
            <div style={{ fontSize:'3rem', marginBottom:'0.5rem' }}>📷</div>
            <p style={{ fontSize:'0.85rem' }}>Camera feed — connected Day 3</p>
          </div>
          {/* Scanning corner brackets */}
          {[{top:12,left:12},{top:12,right:12},{bottom:12,left:12},{bottom:12,right:12}].map((pos,i)=>(
            <div key={i} style={{ position:'absolute', ...pos, width:20, height:20, borderColor:'rgba(99,102,241,0.5)', borderStyle:'solid', borderWidth:'2px 0 0 2px', ...(pos.right!==undefined && !pos.left ? {borderWidth:'2px 2px 0 0'} : {}), ...(pos.bottom!==undefined && !pos.top ? {borderWidth:'0 0 2px 2px'} : {}), ...(pos.bottom!==undefined && pos.right!==undefined ? {borderWidth:'0 2px 2px 0'} : {}) }} />
          ))}
        </div>

        {/* Scores row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
          {[['🧍 Posture', postureScore, '#6366f1'],['👁️ Gaze', gazeScore, '#c084fc']].map(([label, val, color])=>(
            <div className="glass fade-up-3" key={label} style={{ padding:'1.2rem', textAlign:'center' }}>
              <div style={{ color:'#64748b', fontSize:'0.82rem', marginBottom:'0.5rem' }}>{label}</div>
              <div style={{ fontSize:'2rem', fontWeight:800, color }}>{val}%</div>
              <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:4, height:4, marginTop:'0.5rem' }}>
                <div style={{ height:'100%', borderRadius:4, background:`linear-gradient(90deg, ${color}, #38bdf8)`, width:`${val}%`, transition:'width 0.8s ease' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Coach message */}
        <div className="glass-strong fade-up-4" style={{ padding:'1.2rem 1.5rem', marginBottom:'1rem', display:'flex', alignItems:'center', gap:'1rem' }}>
          <div style={{ position:'relative', flexShrink:0 }}>
            <div style={{ width:44, height:44, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#c084fc)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.3rem' }}>🤖</div>
            {isCoaching && <div style={{ position:'absolute', inset:-4, borderRadius:'50%', border:'2px solid #6366f1', animation:'pulseRing 1s ease-out infinite' }} />}
          </div>
          <div>
            <div style={{ fontSize:'0.75rem', color:'#475569', marginBottom:'0.2rem', fontWeight:600, letterSpacing:'0.05em' }}>GEMINI COACH</div>
            <div style={{ color:'#e2e8f0', fontSize:'0.9rem', lineHeight:1.5 }}>{coachMsg}</div>
          </div>
        </div>

        {/* Events log */}
        {events.length > 0 && (
          <div className="glass fade-up" style={{ padding:'1rem 1.5rem', marginBottom:'1rem', maxHeight:100, overflowY:'auto' }}>
            {events.map((e, i) => (
              <div key={i} style={{ display:'flex', gap:'1rem', fontSize:'0.8rem', padding:'0.3rem 0', color:'#64748b' }}>
                <span style={{ color:'#475569', fontFamily:'monospace' }}>{e.time}</span>
                <span style={{ color:'#94a3b8' }}>{e.msg}</span>
              </div>
            ))}
          </div>
        )}

        <button className="btn-danger" onClick={onEnd} style={{ width:'100%' }}>⏹ End Session</button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// REPORT SCREEN
// ─────────────────────────────────────────────
const ReportScreen = ({ onRestart }) => {
  const scores = [
    { label:'Posture',     score:87, icon:'🧍', color:'#6366f1' },
    { label:'Eye Contact', score:74, icon:'👁️', color:'#c084fc' },
    { label:'Voice Pace',  score:91, icon:'🎙️', color:'#38bdf8' },
    { label:'Clarity',     score:82, icon:'💬', color:'#4ade80' },
  ];
  const overall = Math.round(scores.reduce((a,b) => a+b.score, 0) / scores.length);

  return (
    <div style={s.page}>
      <div className="bg-animated" />
      <div style={{ position:'relative', zIndex:1, maxWidth:520, width:'100%', padding:'1.5rem' }}>

        <div style={{ textAlign:'center', marginBottom:'2rem' }} className="fade-up">
          <h2 style={{ fontSize:'2rem', fontWeight:800, marginBottom:'0.3rem' }}>Session Report</h2>
          <p style={{ color:'#64748b', fontSize:'0.9rem' }}>5 minutes • 3 coaching moments</p>
        </div>

        {/* Overall score */}
        <div className="glass-strong fade-up-2" style={{ padding:'2rem', textAlign:'center', marginBottom:'1.5rem' }}>
          <p style={{ color:'#64748b', fontSize:'0.85rem', marginBottom:'1rem', letterSpacing:'0.05em' }}>OVERALL SCORE</p>
          <div style={{ fontSize:'5rem', fontWeight:900 }} className="gradient-text">{overall}</div>
          <div style={{ fontSize:'1.5rem', color:'#fbbf24', marginBottom:'1rem' }}>
            {'★'.repeat(Math.round(overall/20))}{'☆'.repeat(5-Math.round(overall/20))}
          </div>
          <div style={{ background:'rgba(255,255,255,0.05)', borderRadius:8, height:8, overflow:'hidden' }}>
            <div style={{ height:'100%', borderRadius:8, background:'linear-gradient(90deg,#6366f1,#c084fc,#38bdf8)', width:`${overall}%`, transition:'width 1s ease' }} />
          </div>
        </div>

        {/* Individual scores */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', marginBottom:'1.5rem' }} className="fade-up-3">
          {scores.map(({ label, score, icon, color }) => (
            <div className="glass" key={label} style={{ padding:'1.2rem', textAlign:'center' }}>
              <div style={{ fontSize:'1.8rem', marginBottom:'0.4rem' }}>{icon}</div>
              <div style={{ color:'#64748b', fontSize:'0.78rem', marginBottom:'0.3rem' }}>{label}</div>
              <div style={{ fontSize:'1.6rem', fontWeight:800, color }}>{score}%</div>
            </div>
          ))}
        </div>

        {/* Feedback */}
        <div className="glass fade-up-4" style={{ padding:'1.2rem 1.5rem', marginBottom:'1.5rem' }}>
          <p style={{ color:'#64748b', fontSize:'0.78rem', fontWeight:600, letterSpacing:'0.05em', marginBottom:'0.75rem' }}>TOP FEEDBACK</p>
          {[
            ['✅', 'Great posture consistency throughout session'],
            ['⚠️', 'Maintain eye contact during pauses'],
            ['✅', 'Voice pace well-controlled'],
          ].map(([icon, msg], i) => (
            <div key={i} style={{ display:'flex', gap:'0.75rem', padding:'0.5rem 0', borderBottom:'1px solid rgba(255,255,255,0.04)', fontSize:'0.88rem', color:'#cbd5e1' }}>
              <span>{icon}</span><span>{msg}</span>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
          <button className="btn-outline" onClick={onRestart}>New Session</button>
          <button className="btn-primary" onClick={onRestart}>Share Report 🔗</button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('ONBOARDING');
  const sessionId = useRef(`session_${Date.now()}`);

  return (
    <>
      {screen === 'ONBOARDING'  && <OnboardingScreen  onNext={() => setScreen('CALIBRATION')} />}
      {screen === 'CALIBRATION' && <CalibrationScreen onNext={() => setScreen('SESSION')} />}
      {screen === 'SESSION'     && <SessionScreen     sessionId={sessionId.current} onEnd={() => setScreen('REPORT')} />}
      {screen === 'REPORT'      && <ReportScreen      onRestart={() => setScreen('ONBOARDING')} />}
    </>
  );
}

// ─────────────────────────────────────────────
// BASE STYLES
// ─────────────────────────────────────────────
const s = {
  page: {
    minHeight:'100vh', display:'flex',
    alignItems:'center', justifyContent:'center',
    position:'relative', overflow:'hidden',
  },
};