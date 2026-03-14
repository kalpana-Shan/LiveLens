// frontend/src/hooks/useMediaPipeAnalysis.js
import { useEffect, useRef, useState } from 'react';
import { FaceLandmarker, PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export const useMediaPipeAnalysis = (videoRef) => {
  const [metrics, setMetrics] = useState({
    posture: 0,
    eyeContact: 0,
    faceDetection: false,
    gazeDirection: { x: 0, y: 0 },
    headPosition: 'neutral',
    shoulderAlignment: 0,
    confidence: 0
  });

  const faceLandmarkerRef = useRef(null);
  const poseLandmarkerRef = useRef(null);
  const animationRef = useRef(null);
  const lastFrameTimeRef = useRef(0);

  useEffect(() => {
    const initializeMediaPipe = async () => {
      try {
        console.log('Initializing MediaPipe...');
        
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
        );

        // Initialize Face Landmarker (for eye contact)
        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true
        });

        // Initialize Pose Landmarker (for posture)
        poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        console.log('MediaPipe initialized successfully');
        analyzeFrame();
        
      } catch (error) {
        console.error('MediaPipe initialization failed:', error);
      }
    };

    const analyzeFrame = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        animationRef.current = requestAnimationFrame(analyzeFrame);
        return;
      }

      const startTime = performance.now();
      
      // Throttle to 30fps for performance
      if (startTime - lastFrameTimeRef.current < 33) {
        animationRef.current = requestAnimationFrame(analyzeFrame);
        return;
      }
      
      lastFrameTimeRef.current = startTime;

      try {
        // Run both detectors in parallel
        const [faceResults, poseResults] = await Promise.all([
          faceLandmarkerRef.current?.detectForVideo(videoRef.current, startTime),
          poseLandmarkerRef.current?.detectForVideo(videoRef.current, startTime)
        ]);

        const newMetrics = {};

        if (faceResults?.faceLandmarks?.length > 0) {
          const faceMetrics = analyzeFace(faceResults.faceLandmarks[0]);
          Object.assign(newMetrics, faceMetrics, { faceDetection: true });
        } else {
          newMetrics.faceDetection = false;
        }

        if (poseResults?.landmarks?.length > 0) {
          const postureMetrics = analyzePosture(poseResults.landmarks[0]);
          Object.assign(newMetrics, postureMetrics);
        }

        setMetrics(prev => ({ ...prev, ...newMetrics }));
        
      } catch (error) {
        console.error('Frame analysis error:', error);
      }

      animationRef.current = requestAnimationFrame(analyzeFrame);
    };

    const analyzeFace = (landmarks) => {
      try {
        // Get eye landmarks
        const leftEye = {
          center: landmarks[468], // Left eye center
          inner: landmarks[133],
          outer: landmarks[33]
        };
        
        const rightEye = {
          center: landmarks[473], // Right eye center
          inner: landmarks[362],
          outer: landmarks[263]
        };

        // Calculate gaze direction
        const gazeDirection = {
          x: ((leftEye.center.x + rightEye.center.x) / 2) - 0.5,
          y: ((leftEye.center.y + rightEye.center.y) / 2) - 0.5
        };
        
        // Check if looking at camera
        const lookingAtCamera = Math.abs(gazeDirection.x) < 0.1 && Math.abs(gazeDirection.y) < 0.1;
        
        // Calculate eye contact score
        const eyeContactScore = lookingAtCamera ? 100 : Math.max(0, 100 - (Math.abs(gazeDirection.x) + Math.abs(gazeDirection.y)) * 200);

        // Determine head position
        const noseTip = landmarks[1];
        let headPosition = 'neutral';
        if (noseTip.z < -0.1) headPosition = 'leaning forward';
        if (noseTip.z > 0.1) headPosition = 'leaning back';

        return {
          eyeContact: Math.min(100, Math.round(eyeContactScore)),
          gazeDirection,
          headPosition
        };
      } catch (error) {
        console.error('Face analysis error:', error);
        return {
          eyeContact: 0,
          gazeDirection: { x: 0, y: 0 },
          headPosition: 'neutral'
        };
      }
    };

    const analyzePosture = (landmarks) => {
      try {
        // Get shoulder landmarks
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];
        
        // Calculate shoulder alignment
        const shoulderDiff = Math.abs(leftShoulder.y - rightShoulder.y);
        const shoulderAlignment = Math.max(0, 100 - (shoulderDiff * 1000));
        
        // Calculate spine angle
        const spineTop = {
          x: (leftShoulder.x + rightShoulder.x) / 2,
          y: (leftShoulder.y + rightShoulder.y) / 2
        };
        const spineBottom = {
          x: (leftHip.x + rightHip.x) / 2,
          y: (leftHip.y + rightHip.y) / 2
        };
        
        const spineAngle = Math.abs(Math.atan2(
          spineBottom.y - spineTop.y,
          spineBottom.x - spineTop.x
        ) * 180 / Math.PI);
        
        // Ideal spine angle is around 90 degrees
        const postureScore = 100 - Math.min(100, Math.abs(90 - spineAngle));
        
        // Calculate overall confidence (combination of stability and alignment)
        const confidence = Math.round((postureScore * 0.6 + shoulderAlignment * 0.4));

        return {
          posture: Math.max(0, Math.round(postureScore)),
          shoulderAlignment: Math.round(shoulderAlignment),
          confidence
        };
      } catch (error) {
        console.error('Posture analysis error:', error);
        return {
          posture: 0,
          shoulderAlignment: 0,
          confidence: 0
        };
      }
    };

    initializeMediaPipe();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
      }
      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close();
      }
    };
  }, [videoRef]);

  return metrics;
};