import React from 'react';
import { useGameStore } from '../store/gameStore';
import { networkManager } from '../services/NetworkManager';

export const Lobby: React.FC = () => {
    const { roomId, players, isHost } = useGameStore();
    const playerList = Object.values(players);

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white">
            <div className="bg-slate-800 p-8 rounded-xl border border-neon-blue w-96">
                <h2 className="text-2xl text-center mb-4 text-gray-400">ROOM CODE</h2>
                <div className="text-5xl font-mono text-center tracking-widest text-white mb-8 bg-black py-4 rounded border border-gray-700">
                    {roomId}
                </div>

                <div className="space-y-4 mb-8">
                    <h3 className="text-xl border-b border-gray-700 pb-2">PLAYERS ({playerList.length}/2)</h3>
                    {playerList.map((p) => (
                        <div key={p.id} className="flex justify-between items-center bg-slate-700 p-3 rounded">
                            <span>{p.role === 'HOST' ? '👑 ' : '👤 '}{p.name}</span>
                            <span className={`w-3 h-3 rounded-full ${p.ready ? 'bg-green-500' : 'bg-gray-500'}`} />
                        </div>
                    ))}
                    {playerList.length === 0 && <div className="text-gray-500 text-center italic">Waiting...</div>}
                </div>

                {isHost ? (
                    <button
                        onClick={() => networkManager.startGame()}
                        disabled={playerList.length < 2}
                        className={`w-full py-4 text-xl font-bold rounded transition-colors ${playerList.length < 2
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-neon-blue text-black hover:bg-cyan-400'
                            }`}
                    >
                        START GAME
                    </button>
                ) : (
                    <div className="text-center text-neon-green animate-pulse">
                        Waiting for host to start...
                    </div>
                )}
            </div>
        </div>
    );
};
