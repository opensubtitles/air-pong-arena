import React, { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Environment } from '@react-three/drei';
import { Arena } from './Arena';
import { Ball } from './Ball';
import { Paddle } from './Paddle';
import { PowerUpRenderer } from './PowerUpRenderer';

import { PhysicsController } from './PhysicsController';
import { HUD } from '../components/HUD';
import { KeyboardControls } from '../components/KeyboardControls';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { handTracking } from '../services/HandTracking';

interface GameSceneProps {
    demoMode?: boolean;
}

export const GameScene: React.FC<GameSceneProps> = ({ demoMode = false }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [skeleton, setSkeleton] = useState<{ x: number, y: number }[]>([]);

    useEffect(() => {
        // Connect video element to existing camera stream
        if (videoRef.current && handTracking.video) {
            const stream = handTracking.video.srcObject as MediaStream;
            if (stream) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(e => console.log('Video play failed:', e));
            }
        }
    }, []);

    useEffect(() => {
        const updateSkeleton = () => {
            if (handTracking.debugInfo.landmarks.length > 0) {
                setSkeleton(handTracking.debugInfo.landmarks);
            }
            requestAnimationFrame(updateSkeleton);
        };
        updateSkeleton();
    }, []);

    return (
        <div className="w-full h-screen absolute top-0 left-0">
            {!demoMode && <HUD />}

            {/* Hand Tracking Preview - Bottom Right Corner */}
            {!demoMode && (
                <div className="absolute bottom-4 right-4 z-50 w-64 h-48 rounded-lg overflow-hidden border-2 border-neon-blue shadow-[0_0_20px_rgba(0,243,255,0.5)]">
                    {/* Camera Feed */}
                    <video
                        ref={videoRef}
                        className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                        style={{ filter: 'brightness(0.7)' }}
                    />

                    {/* Hand Skeleton Overlay */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        {/* Draw hand skeleton */}
                        {skeleton.map((p, i) => {
                            const isIndexFinger = i >= 5 && i <= 8;
                            return (
                                <circle
                                    key={i}
                                    cx={p.x * 100 + '%'}
                                    cy={p.y * 100 + '%'}
                                    r={i % 4 === 0 ? 4 : 3}
                                    fill={isIndexFinger ? '#FFFF00' : '#FFFFFF'}
                                    opacity={isIndexFinger ? 0.7 : 1}
                                />
                            );
                        })}
                    </svg>
                </div>
            )}

            <div className="w-full h-full -z-10">
                <Canvas
                    camera={{ position: [0, 15, 25], fov: 60 }}
                    shadows={!demoMode} // Disable shadows in demo mode for performance
                    gl={{
                        antialias: false,
                        stencil: false,
                        depth: false,
                        powerPreference: demoMode ? 'low-power' : 'high-performance'
                    }}
                    frameloop={demoMode ? 'demand' : 'always'} // Render on demand in demo mode
                >
                    <PhysicsController />
                    {!demoMode && <KeyboardControls />}

                    {/* Demo Mode Camera Animation */}
                    {demoMode && <OrbitControls autoRotate autoRotateSpeed={0.5} enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2.5} minPolarAngle={Math.PI / 3} />}

                    <ambientLight intensity={0.2} />
                    <directionalLight position={[10, 10, 5]} intensity={1} castShadow={!demoMode} />
                    <pointLight position={[0, 10, 0]} intensity={0.5} color="#00f3ff" />

                    <Suspense fallback={null}>
                        <Environment preset="city" />
                        {/* Reduce stars in demo mode */}
                        <Stars radius={100} depth={50} count={demoMode ? 1000 : 5000} factor={4} saturation={0} fade speed={1} />

                        <Arena />

                        <Ball />
                        {/* Player 1 (Bottom/Near) */}
                        <Paddle position={[0, 0.5, 13]} color="#00f3ff" isOwnPaddle={!demoMode} />
                        {/* Player 2 (Top/Far) */}
                        <Paddle position={[0, 0.5, -13]} color="#ff00ff" isOwnPaddle={false} />

                        <PowerUpRenderer />

                        {/* Controls intended for debug only, will be removed/disabled in gameplay */}
                        {!demoMode && <OrbitControls maxPolarAngle={Math.PI / 2} minDistance={5} maxDistance={50} />}

                        <EffectComposer>
                            <Bloom luminanceThreshold={1} mipmapBlur intensity={1.5} radius={0.6} />
                        </EffectComposer>
                    </Suspense>
                </Canvas>
            </div>
        </div>
    );
};
