import React from 'react';
import { useGameStore } from '../store/gameStore';

export const HUD: React.FC = () => {
    const scores = useGameStore((state) => state.scores);

    return (
        <div className="absolute top-0 w-full p-8 flex justify-between items-start pointer-events-none select-none z-10">
            <div className="text-6xl font-black text-neon-pink drop-shadow-[0_0_10px_rgba(255,0,255,0.8)]">
                {scores.host}
            </div>

            <div className="text-4xl text-white font-mono opacity-50">
                VS
            </div>

            <div className="text-6xl font-black text-neon-blue drop-shadow-[0_0_10px_rgba(0,243,255,0.8)]">
                {scores.client}
            </div>
        </div>
    );
};
