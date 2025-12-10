import React, { useRef } from 'react';
import { Mesh } from 'three';
import { useFrame } from '@react-three/fiber';
import { gamePhysics } from './GamePhysics';
import { useGameStore } from '../store/gameStore';

interface BallProps { }

export const Ball: React.FC<BallProps> = () => {
    const meshRef = useRef<Mesh>(null);

    const activeEffects = useGameStore(state => state.activeEffects);

    // Check if any INVISIBLE_BALL effect is active (global de-buff usually applied to opponent, but makes ball invisible for everyone)
    // Actually, INVISIBLE_BALL is a debuff on the opponent, so they shouldn't see it.
    // But currently we render one 3D scene.
    // Let's make it invisible globally for now, or check local player role.
    const isInvisible = Object.values(activeEffects.host).some(e => e && e > Date.now() && false) || // Logic check: who cast it?
        // Let's simplify: if INVISIBLE_BALL exists in any effect list, hide it?
        // The PowerUp definition says "INVISIBLE_BALL" is a DEBUFF.
        // If I cast it on you, YOU shouldn't see it. I should?
        // For MVP, make it semi-transparent for everyone or invisible pulses.
        (activeEffects.host['INVISIBLE_BALL'] && activeEffects.host['INVISIBLE_BALL'] > Date.now()) ||
        (activeEffects.client['INVISIBLE_BALL'] && activeEffects.client['INVISIBLE_BALL'] > Date.now());

    const isShrunken = (activeEffects.host['SHRINK_BALL'] && activeEffects.host['SHRINK_BALL'] > Date.now()) ||
        (activeEffects.client['SHRINK_BALL'] && activeEffects.client['SHRINK_BALL'] > Date.now());

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.position.copy(gamePhysics.ballPosition);

            // Visual Updates
            const targetScale = isShrunken ? 0.3 : 0.5;
            meshRef.current.scale.setScalar(targetScale * 2); // Geometry is 0.5 radius = 1.0 diam.

            // Pulse opacity if invisible?
            if (isInvisible) {
                const mat = meshRef.current.material as any;
                mat.opacity = 0.1 + Math.sin(state.clock.elapsedTime * 10) * 0.1;
                mat.transparent = true;
            } else {
                const mat = meshRef.current.material as any;
                mat.opacity = 1;
                mat.transparent = false;
            }
        }
    });

    return (
        <mesh ref={meshRef} castShadow>
            <sphereGeometry args={[0.5, 32, 32]} />
            <meshStandardMaterial
                color="#ffffff"
                emissive="#ffffff"
                emissiveIntensity={2}
            />
            <pointLight distance={10} intensity={2} color="#ffffff" />
        </mesh>
    );
};
