// frontend/src/App.jsx
import React from 'react';

function App() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #FF6B6B, #4ECDC4)',
      color: 'white',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      fontSize: '2rem',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>🎯 LiveLens</h1>
      <p style={{ fontSize: '1.2rem', marginTop: '1rem' }}>
        AI-Powered Communication Coach
      </p>
      <button 
        onClick={() => alert('Working!')}
        style={{
          marginTop: '2rem',
          padding: '1rem 2rem',
          fontSize: '1.2rem',
          background: 'white',
          border: 'none',
          borderRadius: '30px',
          cursor: 'pointer',
          fontWeight: 'bold',
          color: '#FF6B6B'
        }}
      >
        Start Practice
      </button>
    </div>
  );
}

export default App;