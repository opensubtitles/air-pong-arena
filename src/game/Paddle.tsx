import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';
import { gamePhysics } from './GamePhysics';

interface PaddleProps {
    position: [number, number, number];
    color?: string;
    isOwnPaddle?: boolean;
}

export const Paddle: React.FC<PaddleProps> = ({ position, color = "#00f3ff", isOwnPaddle }) => {
    const meshRef = useRef<Mesh>(null);

    useFrame(() => {
        if (meshRef.current) {
            // Read mapped position from physics
            // const role = isOwnPaddle ? 'host' : 'client'; 

            const targetX = isOwnPaddle ? gamePhysics.paddles.host : gamePhysics.paddles.client;

            // Dynamic Width
            const targetWidth = isOwnPaddle ? gamePhysics.paddleWidths.host : gamePhysics.paddleWidths.client;

            meshRef.current.position.x = targetX;
            meshRef.current.scale.x = targetWidth; // Default width 1.5, scale 1.0 -> 3.0 means scale = width / 1.5? No, base geo is [3, 0.5, 0.5] from Paddle.tsx?
            // Actually Paddle.tsx geometry args are needed.
        }
    });

    return (
        <mesh ref={meshRef} position={position} castShadow>
            <boxGeometry args={[1, 0.5, 0.5]} /> {/* Base width 1, so scale = actual width */}
            <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isOwnPaddle ? 2 : 1}
            />
        </mesh>
    );
};
