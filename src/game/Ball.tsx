import React, { useRef } from 'react';
import { Mesh } from 'three';
import { useFrame } from '@react-three/fiber';
import { gamePhysics } from './GamePhysics';

interface BallProps { }

export const Ball: React.FC<BallProps> = () => {
    const meshRef = useRef<Mesh>(null);

    useFrame(() => {
        if (meshRef.current) {
            meshRef.current.position.copy(gamePhysics.ballPosition);
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
