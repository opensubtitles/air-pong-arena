import React from 'react';
import { useGameStore } from '../store/gameStore';

export const GameOver: React.FC = () => {
    const { scores } = useGameStore();
    const reset = useGameStore((state) => state.reset);

    const winner = scores.host >= 7 ? 'HOST' : 'CLIENT';

    const handleHome = () => {
        reset();
        // Should also reload page to clear socket state cleanly for MVP
        window.location.reload();
    };

    return (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center text-white">
            <h1 className="text-6xl font-black mb-8 text-neon-pink animate-bounce">
                GAME OVER
            </h1>

            <div className="text-4xl mb-12">
                WINNER: <span className="text-neon-blue">{winner}</span>
            </div>

            <button
                onClick={handleHome}
                className="px-8 py-3 border-2 border-white text-white hover:bg-white hover:text-black transition-colors rounded text-xl"
            >
                BACK TO MENU
            </button>
        </div>
    );
};
