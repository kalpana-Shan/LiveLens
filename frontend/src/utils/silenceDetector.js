// frontend/src/utils/silenceDetector.js

class SilenceDetector {
    constructor(options = {}) {
      this.silenceThreshold = options.silenceThreshold || 0.02; // Volume threshold for silence
      this.silenceDuration = options.silenceDuration || 1500; // 1.5 seconds of silence = end of speech
      this.minSpeechDuration = options.minSpeechDuration || 500; // Minimum speech to consider
      
      this.audioContext = null;
      this.analyser = null;
      this.microphone = null;
      this.dataArray = null;
      
      this.isSpeaking = false;
      this.silenceStartTime = null;
      this.speechStartTime = null;
      
      this.onSpeechStart = null;
      this.onSpeechEnd = null;
      this.onSilence = null;
      
      this.isRunning = false;
      this.animationFrame = null;
    }
  
    async initialize() {
      try {
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.microphone = this.audioContext.createMediaStreamSource(stream);
        
        this.microphone.connect(this.analyser);
        
        this.analyser.fftSize = 256;
        const bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(bufferLength);
        
        console.log('✅ Silence detector initialized');
        return true;
      } catch (err) {
        console.error('❌ Failed to initialize silence detector:', err);
        return false;
      }
    }
  
    start() {
      if (!this.analyser || !this.dataArray) return;
      
      this.isRunning = true;
      this.detect();
    }
  
    stop() {
      this.isRunning = false;
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
      }
    }
  
    detect() {
      if (!this.isRunning) return;
      
      // Get current volume
      this.analyser.getByteFrequencyData(this.dataArray);
      const volume = this.calculateVolume(this.dataArray);
      
      const now = Date.now();
      
      // Check if speaking (volume above threshold)
      if (volume > this.silenceThreshold) {
        if (!this.isSpeaking) {
          // Just started speaking
          this.isSpeaking = true;
          this.speechStartTime = now;
          this.silenceStartTime = null;
          
          if (this.onSpeechStart) {
            this.onSpeechStart();
          }
          console.log('🎤 Speech started');
        }
      } else {
        if (this.isSpeaking) {
          // Just stopped speaking
          if (!this.silenceStartTime) {
            this.silenceStartTime = now;
          }
          
          // Check if silence duration exceeded threshold
          const silenceDuration = now - this.silenceStartTime;
          const speechDuration = this.speechStartTime ? now - this.speechStartTime : 0;
          
          if (silenceDuration > this.silenceDuration && speechDuration > this.minSpeechDuration) {
            this.isSpeaking = false;
            
            if (this.onSpeechEnd) {
              this.onSpeechEnd(speechDuration);
            }
            console.log(`✅ Speech ended - Duration: ${speechDuration}ms`);
            
            if (this.onSilence) {
              this.onSilence();
            }
            
            this.speechStartTime = null;
            this.silenceStartTime = null;
          }
        }
      }
      
      this.animationFrame = requestAnimationFrame(() => this.detect());
    }
  
    calculateVolume(dataArray) {
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      return sum / dataArray.length / 255; // Normalize to 0-1
    }
  
    cleanup() {
      this.stop();
      
      if (this.microphone) {
        this.microphone.disconnect();
      }
      
      if (this.audioContext) {
        this.audioContext.close();
      }
    }
  }
  
  export default SilenceDetector;