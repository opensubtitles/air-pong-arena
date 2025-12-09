import React from 'react';
import { useFrame } from '@react-three/fiber';
import { gamePhysics } from './GamePhysics';

export const PhysicsController: React.FC = () => {
    useFrame((_, delta) => {
        gamePhysics.update(delta);
    });
    return null;
};
