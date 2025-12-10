import React, { useEffect, useRef, useState } from 'react';
import { handTracking } from '../services/HandTracking';

export const CameraOverlay: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [skeleton, setSkeleton] = useState<{ x: number, y: number }[]>([]);

    // Skeleton Colors
    const fingerColors = [
        '#FFFFFF', // 0: Wrist
        '#FF0000', '#FF0000', '#FF0000', '#FF0000', // 1-4: Thumb (Red)
        '#FFFF00', '#FFFF00', '#FFFF00', '#FFFF00', // 5-8: Index (Yellow)
        '#00FF00', '#00FF00', '#00FF00', '#00FF00', // 9-12: Middle (Green)
        '#00FFFF', '#00FFFF', '#00FFFF', '#00FFFF', // 13-16: Ring (Cyan)
        '#FF00FF', '#FF00FF', '#FF00FF', '#FF00FF'  // 17-20: Pinky (Magenta)
    ];

    const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
        [0, 5], [5, 6], [6, 7], [7, 8],       // Index
        [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
        [0, 13], [13, 14], [14, 15], [15, 16],// Ring
        [0, 17], [17, 18], [18, 19], [19, 20] // Pinky
    ];

    useEffect(() => {
        let animationFrameId: number;

        // Init stream
        const initStream = async () => {
            try {
                const stream = await handTracking.startWebcam();
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("CameraOverlay: Failed to get stream", err);
            }
        };

        const updateLoop = () => {
            const info = handTracking.debugInfo;
            if (info.landmarks && info.landmarks.length > 0) {
                setSkeleton(info.landmarks);
            } else {
                setSkeleton([]);
            }
            animationFrameId = requestAnimationFrame(updateLoop);
        };

        initStream();
        updateLoop();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div className="absolute bottom-4 left-4 w-48 h-36 rounded-lg overflow-hidden border-2 border-neon-blue bg-black/50 shadow-[0_0_15px_rgba(0,243,255,0.3)] z-50 pointer-events-none">
            <video
                ref={videoRef}
                className="w-full h-full object-cover -scale-x-100 opacity-60"
                autoPlay
                playsInline
                muted
            />

            <svg className="absolute inset-0 w-full h-full -scale-x-100 opacity-60">
                {skeleton.length > 0 && connections.map(([start, end], i) => {
                    const p1 = skeleton[start];
                    const p2 = skeleton[end];
                    if (!p1 || !p2) return null;
                    return (
                        <line
                            key={i}
                            x1={p1.x * 100 + '%'} y1={p1.y * 100 + '%'}
                            x2={p2.x * 100 + '%'} y2={p2.y * 100 + '%'}
                            stroke="#FFFFFF"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        />
                    );
                })}
                {skeleton.map((p, i) => {
                    const isIndexFinger = i >= 5 && i <= 8;
                    return (
                        <circle
                            key={i}
                            cx={p.x * 100 + '%'}
                            cy={p.y * 100 + '%'}
                            r={isIndexFinger ? 3 : 2}
                            fill={isIndexFinger ? '#FFFF00' : (fingerColors[i] || '#FFF')}
                        />
                    );
                })}
            </svg>
        </div>
    );
};
