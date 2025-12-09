import React from 'react';

export const Arena: React.FC = () => {
    return (
        <group>
            {/* Floor Grid */}
            <gridHelper args={[20, 20, 0xff00ff, 0x222222]} position={[0, -0.1, 0]} />

            {/* Main Floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[20, 30]} />
                <meshStandardMaterial
                    color="#050510"
                    roughness={0.4}
                    metalness={0.8}
                    emissive="#0a0a20"
                    emissiveIntensity={0.2}
                />
            </mesh>

            {/* Walls Neon Glow */}
            <mesh position={[-10.5, 0.5, 0]}>
                <boxGeometry args={[1, 1, 30]} />
                <meshStandardMaterial color="#00f3ff" emissive="#00f3ff" emissiveIntensity={2} />
            </mesh>

            <mesh position={[10.5, 0.5, 0]}>
                <boxGeometry args={[1, 1, 30]} />
                <meshStandardMaterial color="#00f3ff" emissive="#00f3ff" emissiveIntensity={2} />
            </mesh>
        </group>
    );
};
