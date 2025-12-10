import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';
import { gamePhysics } from './GamePhysics';
import { POWER_UPS } from './PowerUps';

export const PowerUpRenderer: React.FC = () => {
    const meshRef = useRef<Mesh>(null);

    useFrame((state, delta) => {
        const powerUp = gamePhysics.activePowerUp;
        if (powerUp && meshRef.current) {
            meshRef.current.visible = true;
            meshRef.current.position.copy(powerUp.position);
            meshRef.current.rotation.x += delta;
            meshRef.current.rotation.y += delta;

            // Pulse Effect
            const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
            meshRef.current.scale.set(scale, scale, scale);

            // Update Material Color
            const def = POWER_UPS[powerUp.type];
            if (def && Array.isArray(meshRef.current.material)) {
                // Should be single material
            } else {
                // @ts-ignore
                if (meshRef.current.material.color) {
                    // @ts-ignore
                    meshRef.current.material.color.set(def.color);
                    // @ts-ignore
                    meshRef.current.material.emissive.set(def.color);
                }
            }

        } else if (meshRef.current) {
            meshRef.current.visible = false;
        }
    });

    return (
        <mesh ref={meshRef} visible={false}>
            <sphereGeometry args={[0.5, 32, 32]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} roughness={0.2} metalness={0.8} />
        </mesh>
    );
};
