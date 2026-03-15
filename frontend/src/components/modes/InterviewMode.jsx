// frontend/src/components/modes/InterviewMode.jsx
import React, { useEffect, useRef, useState } from 'react';

const InterviewMode = () => {
  const videoRef = useRef(null);
  const [error, setError] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [stream, setStream] = useState(null);
  
  useEffect(() => {
    // Request camera access
    const initCamera = async () => {
      try {
        console.log('📷 Requesting camera access...');
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        
        setStream(mediaStream);
        setPermissionGranted(true);
        console.log('✅ Camera access granted');
      } catch (err) {
        console.error('❌ Camera error:', err);
        setError('Please allow camera and microphone access');
      }
    };
    
    initCamera();
    
    // Cleanup
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Separate effect for setting video source
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      // Don't call play() - it will auto-play when srcObject is set
    }
  }, [stream]);

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
        <div style={{ background: 'white', padding: '3rem', borderRadius: '20px', color: '#333' }}>
          <h2 style={{ color: '#FF6B6B', marginBottom: '1rem' }}>⚠️ {error}</h2>
          <p style={{ marginBottom: '2rem' }}>Click the button below to try again</p>
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
      padding: '2rem',
      background: 'linear-gradient(135deg, #FF6B6B, #4ECDC4)',
      minHeight: '100vh',
      color: 'white'
    }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem', textAlign: 'center' }}>🎯 Interview Mode</h1>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '2rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Video Section */}
        <div style={{ 
          background: '#1a1a1a', 
          borderRadius: '20px',
          overflow: 'hidden',
          aspectRatio: '16/9',
          position: 'relative'
        }}>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {!permissionGranted && (
            <div style={{
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
              gap: '1rem'
            }}>
              <p style={{ fontSize: '1.2rem' }}>Requesting camera access...</p>
            </div>
          )}
        </div>

        {/* Chat Section */}
        <div style={{ 
          background: 'white', 
          borderRadius: '20px',
          padding: '2rem',
          color: '#333',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '2rem' }}>🤖</span>
            <h2 style={{ color: '#FF6B6B' }}>AI Interviewer</h2>
          </div>
          
          {permissionGranted ? (
            <>
              <div style={{ 
                background: '#4ECDC4', 
                color: 'white', 
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                display: 'inline-block',
                width: 'fit-content'
              }}>
                ✅ Camera & Microphone Active
              </div>
              <p style={{ marginTop: '1rem', lineHeight: '1.6' }}>
                Welcome to your interview practice! I'm your AI interviewer. 
                Tell me about yourself and why you're interested in this role.
              </p>
              <div style={{ marginTop: '1rem' }}>
                <textarea
                  placeholder="Type your response here..."
                  style={{
                    width: '100%',
                    padding: '1rem',
                    borderRadius: '10px',
                    border: '2px solid #FF6B6B',
                    fontSize: '1rem',
                    minHeight: '100px',
                    resize: 'vertical'
                  }}
                />
                <button
                  style={{
                    marginTop: '1rem',
                    padding: '0.8rem 2rem',
                    background: '#FF6B6B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '30px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    width: '100%'
                  }}
                >
                  Send Response
                </button>
              </div>
            </>
          ) : (
            <p>⏳ Waiting for camera and microphone access...</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewMode;