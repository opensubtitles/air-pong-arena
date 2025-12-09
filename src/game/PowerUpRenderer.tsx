import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';
import { gamePhysics } from './GamePhysics';

export const PowerUpRenderer: React.FC = () => {
    const meshRef = useRef<Mesh>(null);

    useFrame((_, delta) => {
        const powerUp = gamePhysics.activePowerUp;
        if (powerUp && meshRef.current) {
            meshRef.current.visible = true;
            meshRef.current.position.copy(powerUp.position);
            meshRef.current.rotation.x += delta;
            meshRef.current.rotation.y += delta;
        } else if (meshRef.current) {
            meshRef.current.visible = false;
        }
    });

    return (
        <mesh ref={meshRef} visible={false}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={2} />
        </mesh>
    );
};
