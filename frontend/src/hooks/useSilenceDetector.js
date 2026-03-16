// frontend/src/hooks/useSilenceDetector.js

import { useEffect, useRef, useState, useCallback } from 'react';
import SilenceDetector from '../utils/silenceDetector';

export const useSilenceDetector = (options = {}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastSpeechDuration, setLastSpeechDuration] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const detectorRef = useRef(null);
  const onSpeechEndCallback = useRef(null);
  const onSpeechStartCallback = useRef(null);

  useEffect(() => {
    const initDetector = async () => {
      const detector = new SilenceDetector({
        silenceThreshold: options.silenceThreshold || 0.02,
        silenceDuration: options.silenceDuration || 1500,
        minSpeechDuration: options.minSpeechDuration || 500
      });
      
      const success = await detector.initialize();
      
      if (success) {
        detector.onSpeechStart = () => {
          setIsSpeaking(true);
          if (onSpeechStartCallback.current) {
            onSpeechStartCallback.current();
          }
        };
        
        detector.onSpeechEnd = (duration) => {
          setIsSpeaking(false);
          setLastSpeechDuration(duration);
          if (onSpeechEndCallback.current) {
            onSpeechEndCallback.current(duration);
          }
        };
        
        detector.onSilence = () => {
          // Silence detected - can trigger actions
        };
        
        detectorRef.current = detector;
        setIsInitialized(true);
        detector.start();
      }
    };
    
    initDetector();
    
    return () => {
      if (detectorRef.current) {
        detectorRef.current.cleanup();
      }
    };
  }, [options.silenceThreshold, options.silenceDuration, options.minSpeechDuration]);

  const onSpeechEnd = useCallback((callback) => {
    onSpeechEndCallback.current = callback;
  }, []);

  const onSpeechStart = useCallback((callback) => {
    onSpeechStartCallback.current = callback;
  }, []);

  const reset = useCallback(() => {
    setLastSpeechDuration(0);
  }, []);

  return {
    isSpeaking,
    lastSpeechDuration,
    isInitialized,
    onSpeechEnd,
    onSpeechStart,
    reset
  };
};