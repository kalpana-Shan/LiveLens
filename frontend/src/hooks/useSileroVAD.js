// frontend/src/hooks/useSileroVAD.js
import { useEffect, useRef, useState } from 'react';

export const useSileroVAD = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceMetrics, setVoiceMetrics] = useState({
    volume: 0,
    clarity: 85,
    fillerWords: [],
    pace: 0,
    confidence: 75
  });

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const fillerWordsRef = useRef([]);
  const speechRecognitionRef = useRef(null);
  const animationRef = useRef(null);

  const FILLER_WORDS = new Set(['um', 'uh', 'like', 'actually', 'basically', 'literally', 'sort of', 'kind of', 'well', 'you know']);

  useEffect(() => {
    const initializeVAD = async () => {
      try {
        console.log('Initializing voice detection...');
        
        // Initialize audio context
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        
        // Get microphone access
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000
          }
        });

        const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
        source.connect(analyserRef.current);
        
        // Configure analyser
        analyserRef.current.fftSize = 512;
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Initialize speech recognition for filler words
        initializeSpeechRecognition();

        // Start voice analysis
        const analyzeVoice = () => {
          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Calculate volume (0-100)
          const sum = dataArray.reduce((a, b) => a + b, 0);
          const avg = sum / bufferLength;
          const volume = Math.min(100, Math.round((avg / 255) * 100));

          // Detect if speaking (volume threshold)
          const speaking = volume > 15;
          setIsSpeaking(speaking);

          // Calculate pace based on speaking chunks
          const pace = calculatePace(speaking);

          // Update metrics
          setVoiceMetrics(prev => ({
            ...prev,
            volume,
            pace,
            fillerWords: fillerWordsRef.current.slice(-5),
            clarity: calculateClarity(volume, fillerWordsRef.current.length)
          }));

          animationRef.current = requestAnimationFrame(analyzeVoice);
        };

        analyzeVoice();
        console.log('Voice detection initialized');
        
      } catch (error) {
        console.error('Voice detection initialization failed:', error);
      }
    };

    const initializeSpeechRecognition = () => {
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        speechRecognitionRef.current = new SpeechRecognition();
        
        speechRecognitionRef.current.continuous = true;
        speechRecognitionRef.current.interimResults = true;
        speechRecognitionRef.current.lang = 'en-US';
        
        speechRecognitionRef.current.onresult = (event) => {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript.toLowerCase();
            const words = transcript.split(' ');
            
            // Detect filler words
            words.forEach(word => {
              const cleanWord = word.replace(/[.,!?]$/, '');
              if (FILLER_WORDS.has(cleanWord)) {
                fillerWordsRef.current.push({
                  word: cleanWord,
                  timestamp: Date.now()
                });
                
                // Keep only last 20 filler words
                if (fillerWordsRef.current.length > 20) {
                  fillerWordsRef.current.shift();
                }
              }
            });
          }
        };

        speechRecognitionRef.current.onerror = (event) => {
          console.log('Speech recognition error:', event.error);
        };

        try {
          speechRecognitionRef.current.start();
        } catch (e) {
          console.log('Speech recognition start error:', e);
        }
      } else {
        console.log('Speech recognition not supported');
      }
    };

    const calculatePace = (speaking) => {
      // Simple pace calculation (words per minute estimate)
      // In production, you'd use a more sophisticated algorithm
      if (!speaking) return 0;
      
      // Mock pace between 120-160 WPM for demo
      return Math.floor(Math.random() * 40) + 120;
    };

    const calculateClarity = (volume, fillerCount) => {
      // Clarity based on volume and filler words
      let clarity = 85; // Base clarity
      
      // Adjust based on volume (too low or too high reduces clarity)
      if (volume < 20) clarity -= 10;
      if (volume > 90) clarity -= 5;
      
      // Reduce clarity based on filler words
      clarity -= fillerCount * 2;
      
      return Math.max(60, Math.min(100, clarity));
    };

    initializeVAD();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (e) {}
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return { isSpeaking, voiceMetrics };
};