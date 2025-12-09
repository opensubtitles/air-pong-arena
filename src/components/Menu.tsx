import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { networkManager } from '../services/NetworkManager';
import { soundManager } from '../services/SoundManager';
import { User, PlusSquare, LogIn, Hash } from 'lucide-react'; // Icons

export const Menu: React.FC = () => {
    const [joinCode, setJoinCode] = useState('');
    const setPhase = useGameStore((state) => state.setPhase);
    const setGameMode = useGameStore((state) => state.setGameMode);
    const setIsHost = useGameStore((state) => state.setIsHost);

    const handleSinglePlayer = () => {
        soundManager.init();
        setGameMode('SINGLE_PLAYER');
        setIsHost(true);
        setPhase('CALIBRATION');
    };

    const handleCreate = () => {
        soundManager.init();
        networkManager.connect();
        setTimeout(() => {
            networkManager.createRoom();
            setPhase('LOBBY');
        }, 500);
    };

    const handleJoin = () => {
        if (joinCode.length !== 6) return alert('Invalid Code');
        soundManager.init();
        networkManager.connect();
        setTimeout(() => {
            networkManager.joinRoom(joinCode.toUpperCase());
            setPhase('LOBBY');
        }, 500);
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-transparent text-white font-mono z-10 relative">
            <h1 className="text-6xl font-bold mb-12 text-neon-blue drop-shadow-[0_0_15px_rgba(0,243,255,0.7)]">
                AIR PONG ARENA
            </h1>

            <div className="space-y-4 w-64">
                <button
                    onClick={handleSinglePlayer}
                    className="w-full py-4 text-xl border-2 border-neon-yellow text-neon-yellow hover:bg-gray-800 hover:shadow-[0_0_20px_rgba(250,204,21,0.6)] transition-all rounded font-bold flex items-center justify-center gap-3"
                >
                    <User className="w-6 h-6" />
                    SINGLE PLAYER
                </button>

                <button
                    onClick={handleCreate}
                    className="w-full py-4 text-xl border-2 border-neon-pink text-neon-pink hover:bg-gray-800 hover:shadow-[0_0_20px_rgba(236,72,153,0.6)] transition-all rounded font-bold flex items-center justify-center gap-3"
                >
                    <PlusSquare className="w-6 h-6" />
                    CREATE ROOM
                </button>

                <div className="flex gap-2 relative">
                    <div className="relative flex-1">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neon-green/50" />
                        <input
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            placeholder="CODE"
                            maxLength={6}
                            className="w-full bg-transparent border-2 border-neon-green text-center text-xl py-4 pl-8 text-neon-green placeholder-gray-600 focus:outline-none focus:bg-gray-800 focus:shadow-[0_0_20px_rgba(34,197,94,0.6)] transition-all rounded font-bold"
                        />
                    </div>
                    <button
                        onClick={handleJoin}
                        className="px-6 border-2 border-neon-green text-neon-green hover:bg-gray-800 hover:shadow-[0_0_20px_rgba(34,197,94,0.6)] transition-all rounded font-bold flex items-center justify-center"
                    >
                        <LogIn className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
};
