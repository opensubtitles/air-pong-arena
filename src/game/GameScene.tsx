import React, { Suspense } from 'react';
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

interface GameSceneProps {
    demoMode?: boolean;
}

export const GameScene: React.FC<GameSceneProps> = ({ demoMode = false }) => {
    return (
        <div className="w-full h-screen absolute top-0 left-0">
            {!demoMode && <HUD />}
            <div className="w-full h-full -z-10">
                <Canvas
                    camera={{ position: [0, 15, 25], fov: 60 }}
                    shadows
                    gl={{ antialias: false, stencil: false, depth: false }} // Optimization for postprocessing
                >
                    <PhysicsController />
                    {!demoMode && <KeyboardControls />}

                    {/* Demo Mode Camera Animation */}
                    {demoMode && <OrbitControls autoRotate autoRotateSpeed={0.5} enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2.5} minPolarAngle={Math.PI / 3} />}

                    <ambientLight intensity={0.2} />
                    <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
                    <pointLight position={[0, 10, 0]} intensity={0.5} color="#00f3ff" />

                    <Suspense fallback={null}>
                        <Environment preset="city" />
                        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

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
