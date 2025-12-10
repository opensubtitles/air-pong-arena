import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { gamePhysics } from '../game/GamePhysics';
import { useGameStore } from '../store/gameStore';

export const KeyboardControls = () => {
    const keys = useRef({ left: false, right: false });
    const isHost = useGameStore((state) => state.isHost);
    const role = isHost ? 'host' : 'client';

    useEffect(() => {
        const handleDown = (e: KeyboardEvent) => {
            if (e.code === 'ArrowLeft') keys.current.left = true;
            if (e.code === 'ArrowRight') keys.current.right = true;

            // Activate Power Up
            if (e.code === 'Space') {
                gamePhysics.useInventory(role);
            }
        };

        const handleUp = (e: KeyboardEvent) => {
            if (e.code === 'ArrowLeft') keys.current.left = false;
            if (e.code === 'ArrowRight') keys.current.right = false;
        };

        window.addEventListener('keydown', handleDown);
        window.addEventListener('keyup', handleUp);

        return () => {
            window.removeEventListener('keydown', handleDown);
            window.removeEventListener('keyup', handleUp);
        };
    }, []);

    useFrame((_, delta) => {
        // Only run if keys are pressed
        if (!keys.current.left && !keys.current.right) return;

        // Current position
        const currentX = gamePhysics.paddles[role];

        // Speed in units per second (Matches roughly hand speed)
        const speed = 15;

        let move = 0;
        if (keys.current.left) move -= speed * delta;
        if (keys.current.right) move += speed * delta;

        // Apply new position with limits (-9 to 9 roughly, arena is -10 to 10 but paddle has width)
        let newX = currentX + move;
        if (newX < -9) newX = -9;
        if (newX > 9) newX = 9;

        gamePhysics.updatePaddle(role, newX);
    });

    return null;
};
