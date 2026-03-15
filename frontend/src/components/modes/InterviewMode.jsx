// frontend/src/components/modes/InterviewMode.jsx
import React, { useEffect, useRef, useState } from 'react';  // ← MUST HAVE ALL THESE IMPORTS!

const InterviewMode = () => {
  const videoRef = useRef(null);
  const [error, setError] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  
  useEffect(() => {
    // Request camera access
    const initCamera = async () => {
      try {
        console.log('📷 Requesting camera access...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        
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
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

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
          <h2>⚠️ {error}</h2>
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
              marginTop: '1rem'
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
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>🎯 Interview Mode Active</h1>
      
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
          aspectRatio: '16/9'
        }}>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        {/* Chat Section */}
        <div style={{ 
          background: 'white', 
          borderRadius: '20px',
          padding: '1.5rem',
          color: '#333'
        }}>
          <h2 style={{ marginBottom: '1rem' }}>AI Interviewer</h2>
          {permissionGranted ? (
            <p>✅ Camera and microphone active</p>
          ) : (
            <p>⏳ Waiting for camera access...</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewMode;  // ← MUST HAVE THIS!