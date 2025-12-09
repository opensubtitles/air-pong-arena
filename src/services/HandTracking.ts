import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import * as fp from 'fingerpose';
import { gamePhysics } from '../game/GamePhysics';
import { useGameStore } from '../store/gameStore';
import { FistGesture, OpenPalmGesture } from './Gestures';

class HandTrackingService {
    handLandmarker: HandLandmarker | undefined;
    video: HTMLVideoElement | undefined;
    runningBox = false;
    gestureEstimator: fp.GestureEstimator;

    // Debug Data
    public debugInfo = {
        initialized: false,
        handsDetected: 0,
        indexFingerX: 0,
        indexFingerY: 0,
        fps: 0,
        lastProcessTime: 0,
        gesture: 'None',
        handSize: 0, // Distance between wrist (0) and middle finger MCP (9)
        landmarks: [] as { x: number, y: number }[]
    };

    constructor() {
        // Init Fingerpose Estimator with Fist and Open Palm
        this.gestureEstimator = new fp.GestureEstimator([
            FistGesture,
            OpenPalmGesture
        ]);
    }

    async initialize() {
        console.log('initialize() called - checking state:', {
            initialized: this.debugInfo.initialized,
            hasLandmarker: !!this.handLandmarker
        });

        // Prevent double initialization
        if (this.debugInfo.initialized || this.handLandmarker) {
            console.log("HandTracker already initialized, skipping");
            return;
        }

        console.log('Proceeding with initialization...');


        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 2
        });
        this.debugInfo.initialized = true;
        console.log("HandTracker initialized");
    }

    startWebcam(videoElement: HTMLVideoElement) {
        this.video = videoElement;
        navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
            videoElement.srcObject = stream;
            videoElement.muted = true; // Ensure muted for autoplay
            videoElement.playsInline = true; // Required for mobile

            // Play with error handling
            videoElement.play().then(() => {
                console.log('Video playing successfully');
            }).catch((err) => {
                console.error('Video play failed:', err);
            });

            videoElement.addEventListener("loadeddata", () => {
                console.log('Video loaded, starting hand tracking');
                this.predictWebcam();
            });
        }).catch((err) => {
            console.error('Camera access failed:', err);
        });
    }

    predictWebcam() {
        if (!this.handLandmarker || !this.video) return;

        // Ensure video is actually playing
        if (this.video.paused || this.video.readyState < 2) {
            requestAnimationFrame(() => this.predictWebcam());
            return;
        }

        const startTimeMs = performance.now();

        // Log video state to verify it's playing
        if (Math.random() < 0.02) { // Log 2% of frames
            console.log('Video time:', this.video.currentTime.toFixed(2), 'Paused:', this.video.paused, 'Ready:', this.video.readyState);
        }

        // Detect hands from video
        const results = this.handLandmarker.detectForVideo(this.video, startTimeMs);

        // Update Debug Info
        const processTime = performance.now() - startTimeMs;

        this.debugInfo.handsDetected = results.landmarks.length;
        this.debugInfo.lastProcessTime = processTime;

        // Debug logging
        if (Math.random() < 0.01) { // Log 1% of frames to avoid spam
            console.log('HandTracking: detected', results.landmarks.length, 'hands');
        }

        // Simple FPS
        this.debugInfo.fps = 1000 / (processTime + 1);

        if (results.landmarks && results.landmarks.length > 0) {
            // Get Index Finger Tip (Index 8) of first hand
            const landmarks = results.landmarks[0];
            const indexFinger = landmarks[8];

            // Map X (0-1) to Arena Coordinates (-10 to 10)
            const arenaX = (0.5 - indexFinger.x) * 20;

            this.debugInfo.indexFingerX = indexFinger.x; // Raw X
            this.debugInfo.indexFingerY = indexFinger.y; // Raw Y

            // More frequent logging to debug position tracking
            if (Math.random() < 0.05) { // Log 5% of frames
                console.log('Hand position:', indexFinger.x.toFixed(3), indexFinger.y.toFixed(3), 'Arena X:', arenaX.toFixed(2));
            }

            // Calculate Scale/Distance (Wrist 0 to Middle MCP 9)
            const wrist = landmarks[0];
            const middleMCP = landmarks[9];
            const dx = middleMCP.x - wrist.x;
            const dy = middleMCP.y - wrist.y;
            const dz = middleMCP.z - wrist.z;
            const handSize = Math.sqrt(dx * dx + dy * dy + dz * dz);

            this.debugInfo.handSize = handSize;

            // Store landmarks for skeleton rendering
            this.debugInfo.landmarks = landmarks.map(lm => ({ x: lm.x, y: lm.y }));

            const role = useGameStore.getState().isHost ? 'host' : 'client';
            gamePhysics.updatePaddle(role, arenaX);

            // --- GESTURE RECOGNITION (Fingerpose) ---
            // The original code used fp.GestureEstimator with landmarks.
            // The provided snippet suggests a different GestureEstimator and worldLandmarks.
            // To maintain functionality with the existing setup, we'll stick to fp.GestureEstimator
            // and map landmarks to the format it expects.
            const fpLandmarks = landmarks.map(l => [l.x, l.y, l.z]);
            const estimation = this.gestureEstimator.estimate(fpLandmarks, 8.5);

            if (estimation.gestures.length > 0) {
                const best = estimation.gestures.reduce((prev, curr) => prev.score > curr.score ? prev : curr);
                this.debugInfo.gesture = best.name;
                gamePhysics.triggerGesture(role, best.name);
            } else {
                this.debugInfo.gesture = 'None';
            }
        }

        requestAnimationFrame(() => this.predictWebcam());
    }
}

export const handTracking = new HandTrackingService();
