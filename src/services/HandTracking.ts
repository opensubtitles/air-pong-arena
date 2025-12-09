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
            videoElement.addEventListener("loadeddata", () => {
                this.predictWebcam();
            });
        });
    }

    predictWebcam() {
        if (!this.handLandmarker || !this.video) return;

        const startTimeMs = performance.now();
        if (this.video.currentTime !== this.video.duration) { // Check if valid
            const results = this.handLandmarker.detectForVideo(this.video, startTimeMs);

            // Update Debug Info
            const now = performance.now();
            const processTime = now - startTimeMs;

            this.debugInfo.handsDetected = results.landmarks.length;
            this.debugInfo.lastProcessTime = processTime;

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

                // Calculate Scale/Distance (Wrist 0 to Middle MCP 9)
                const wrist = landmarks[0];
                const middleMCP = landmarks[9];
                const dx = wrist.x - middleMCP.x;
                const dy = wrist.y - middleMCP.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                this.debugInfo.handSize = dist;

                // Pass full skeleton for visualization
                this.debugInfo.landmarks = landmarks.map(l => ({ x: l.x, y: l.y }));

                const role = useGameStore.getState().isHost ? 'host' : 'client';
                gamePhysics.updatePaddle(role, arenaX);

                // --- GESTURE RECOGNITION (Fingerpose) ---
                const fpLandmarks = landmarks.map(l => [l.x, l.y, l.z]);
                const estimation = this.gestureEstimator.estimate(fpLandmarks, 8.5);

                if (estimation.gestures.length > 0) {
                    const best = estimation.gestures.reduce((p, c) => (p.score > c.score ? p : c));
                    this.debugInfo.gesture = best.name;

                    // Trigger Game Action
                    gamePhysics.triggerGesture(role, best.name);
                } else {
                    this.debugInfo.gesture = 'None';
                }
            }
        }

        requestAnimationFrame(() => this.predictWebcam());
    }
}

export const handTracking = new HandTrackingService();
